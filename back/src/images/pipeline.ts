// Пайплайн обработки картинок (docs/architecture.md §6). Чистая граница: ЗНАЕТ только про
// байты и sharp, НЕ знает про S3/БД (склейку делает store.ts). На вход — буфер оригинала,
// на выход — натуральные w/h, варианты thumb/full × avif/webp/jpg и LQIP-плейсхолдер.
//
// sharp поднимается под Bun на oven/bun:1 (glibc) с нативным libvips — проверено в задаче 04
// (`sharp.versions`), fallback на @napi-rs/image НЕ потребовался.
//
// Анимация (GIF, анимированный WebP): кадры доживают ТОЛЬКО до webp-вариантов — libheif в
// sharp кодирует avif одним кадром, а jpeg кадров не знает вовсе, поэтому avif/jpg у таких
// картинок остаются первым кадром (и фронт не предлагает avif-источник, иначе браузер выбрал
// бы статику). Перекодирование ленты дорогое и не всегда выгодное: длинный GIF считается
// десятками секунд и легко весит больше оригинала — на такие случаи есть GIF-подстраховка
// (`anim: 'gif'`, см. media-url.ts).

import sharp from 'sharp'
import {
  IMAGE_FORMATS,
  IMAGE_VARIANTS,
  type ImageAnim,
  type ImageFormat,
  type ImageVariant,
} from '../media-url.ts'

// ── Конфиг пайплайна (одно место) ─────────────────────────────────────────────
// Имена/порядок вариантов и форматов — из media-url.ts (единый источник для URL и обработки).
// Здесь добавляем только числовые параметры: предельный размер по бóльшей стороне и качество.

/** Предел по бóльшей стороне (px): thumb — листинг, full — модалка. `fit: inside`, без апскейла. */
export const VARIANT_MAX_EDGE: Record<ImageVariant, number> = { thumb: 800, full: 2000 }
/** Качество кодеков по форматам (0–100). AVIF агрессивнее (меньше вес при том же качестве). */
const FORMAT_QUALITY: Record<ImageFormat, number> = { avif: 50, webp: 78, jpg: 80 }
/** Размер и размытие LQIP-плейсхолдера: крошечная картинка → короткий base64. */
const LQIP_EDGE = 24
const LQIP_BLUR = 2
/**
 * Бюджет перекодирования full-анимации: пикселей во ВСЕЙ ленте (ширина × высота кадра × кадры).
 * 40 МП ≈ 3–5 секунд работы libvips; выше — загрузка в админке висела бы десятками секунд
 * (замер: GIF 720×1280 × 282 кадра = 260 МП кодировался ~20 с). Для ленты сверх бюджета full
 * остаётся оригинальным GIF'ом — ноль работы и предсказуемое время ответа.
 */
export const ANIM_FULL_BUDGET = 40_000_000

/** Байты одного размерного варианта во всех форматах. */
export type VariantBytes = Record<ImageFormat, Uint8Array>
/** Полный набор сгенерированных вариантов: thumb/full × avif/webp/jpg. */
export type ProcessedVariants = Record<ImageVariant, VariantBytes>

export interface ProcessedImage {
  /** Натуральная ширина оригинала (для aspect-ratio на фронте). */
  width: number
  /** Натуральная высота ОДНОГО кадра (у анимаций — не высота ленты кадров). */
  height: number
  /** Закодированные варианты (байты), готовые к заливке в MinIO. */
  variants: ProcessedVariants
  /** Крошечный blur-плейсхолдер как data-URI (`data:image/webp;base64,…`). */
  lqip: string
  /** Носитель анимации (`null` — статичная картинка); `'gif'` требует заливки оригинала. */
  anim: ImageAnim | null
}

/** Опции пайплайна (сейчас — только бюджет анимации; в тестах опускается до игрушечного). */
export interface ProcessOptions {
  /** Предел пикселей ленты для перекодирования full-анимации (см. `ANIM_FULL_BUDGET`). */
  animFullBudget?: number
}

/** Тип конвейера sharp (sharp использует `export =`, поэтому берём через ReturnType). */
type SharpPipeline = ReturnType<typeof sharp>

function assertNever(x: never): never {
  throw new Error(`pipeline: unhandled image format: ${String(x)}`)
}

/** Кодирует уже отресайзенный конвейер sharp в заданный формат с дефолтным качеством. */
function encode(pipe: SharpPipeline, format: ImageFormat): Promise<Buffer> {
  switch (format) {
    case 'avif':
      return pipe.avif({ quality: FORMAT_QUALITY.avif }).toBuffer()
    case 'webp':
      return pipe.webp({ quality: FORMAT_QUALITY.webp }).toBuffer()
    case 'jpg':
      return pipe.jpeg({ quality: FORMAT_QUALITY.jpg }).toBuffer()
    default:
      return assertNever(format)
  }
}

/**
 * Прогоняет оригинал через пайплайн §6:
 * 1) читает натуральные `width/height` (у анимаций — размер КАДРА: sharp в animated-режиме
 *    отдаёт высоту всей ленты кадров, и по ней фронт поставил бы вытянутый aspect-ratio);
 * 2) генерирует thumb (~800px) и full (~2000px) — каждый в avif/webp/jpg (`fit: inside`,
 *    без апскейла: вариант не больше оригинала);
 * 3) у анимации переносит кадры в webp-варианты и выбирает носитель (`anim`);
 * 4) собирает крошечный blur-LQIP в base64 (всегда по первому кадру).
 *
 * Бросает, если у входа нет валидных размеров (битый/не-картинка).
 */
export async function processImage(
  input: Uint8Array | ArrayBuffer | Buffer,
  options: ProcessOptions = {},
): Promise<ProcessedImage> {
  // Один декод оригинала; `clone()` ветвит конвейер на каждый выход (one-input→many-output).
  const source = sharp(input, { failOn: 'none' })
  const meta = await source.metadata()
  if (!meta.width || !meta.height) {
    throw new Error('pipeline: input has no decodable dimensions')
  }

  // `source` читает только первый кадр (pages по умолчанию 1) — значит его height и есть
  // высота кадра; ленту кадров видит отдельный animated-конвейер ниже.
  const frames = await countFrames(input)
  const budget = options.animFullBudget ?? ANIM_FULL_BUDGET
  // GIF-подстраховка возможна только для GIF-входа: оригинал отдаётся как есть, под ключом
  // `full.gif` — для анимированного webp сверх бюджета подставлять нечего.
  const isGif = meta.format === 'gif'
  let anim = pickAnim(frames, meta.width * meta.height * frames, budget, isGif)
  const animated = anim !== null ? sharp(input, { animated: true, failOn: 'none' }) : null

  const variants = {} as ProcessedVariants
  for (const variant of IMAGE_VARIANTS) {
    const edge = VARIANT_MAX_EDGE[variant]
    const bytes = {} as VariantBytes
    for (const format of IMAGE_FORMATS) {
      // Кадры переносим только в webp и только в webp-ветке: у `anim: 'gif'` лента заведомо
      // тяжёлая, и анимировать ею ещё и тайл листинга нельзя — перекодированный thumb такого
      // GIF'а весит мегабайты (замер: 282 кадра → 6.3 МБ), а тайлов на экране десятки.
      const carriesFrames = animated !== null && format === 'webp' && anim === 'webp'
      const pipe = (carriesFrames ? animated : source).clone()
      bytes[format] = new Uint8Array(
        await encode(pipe.resize(edge, edge, { fit: 'inside', withoutEnlargement: true }), format),
      )
    }
    variants[variant] = bytes
  }

  // Перекодированная лента бывает тяжелее исходного GIF (много кадров, мало похожих пикселей).
  // Платить трафиком за webp в таком случае незачем — отдаём оригинал, а full.webp
  // пересобираем первым кадром, чтобы в хранилище не лежала бесполезная тяжёлая копия.
  if (anim === 'webp' && isGif && variants.full.webp.byteLength >= byteLength(input)) {
    anim = 'gif'
    variants.full.webp = new Uint8Array(
      await encode(
        source.clone().resize(VARIANT_MAX_EDGE.full, VARIANT_MAX_EDGE.full, {
          fit: 'inside',
          withoutEnlargement: true,
        }),
        'webp',
      ),
    )
  }

  const lqipBuffer = await source
    .clone()
    .resize(LQIP_EDGE, LQIP_EDGE, { fit: 'inside', withoutEnlargement: true })
    .blur(LQIP_BLUR)
    .webp({ quality: 40 })
    .toBuffer()
  const lqip = `data:image/webp;base64,${lqipBuffer.toString('base64')}`

  return { width: meta.width, height: meta.height, variants, lqip, anim }
}

/** Размер входа в байтах (вход принимаем в трёх формах — у всех есть byteLength). */
function byteLength(input: Uint8Array | ArrayBuffer | Buffer): number {
  return input.byteLength
}

/** Число кадров во входных байтах (1 — статичная картинка). */
async function countFrames(input: Uint8Array | ArrayBuffer | Buffer): Promise<number> {
  const meta = await sharp(input, { animated: true, failOn: 'none' }).metadata()
  return meta.pages ?? 1
}

/**
 * Выбирает носитель анимации. Лента в пределах бюджета переезжает в webp целиком; лента
 * сверх бюджета остаётся оригинальным GIF'ом, а если подставить оригинал нельзя (вход не
 * GIF) — картинка честно объявляется статичной, и лишних кадров мы не храним нигде.
 */
function pickAnim(
  frames: number,
  stripPixels: number,
  budget: number,
  isGif: boolean,
): ImageAnim | null {
  if (frames <= 1) return null
  if (stripPixels <= budget) return 'webp'
  return isGif ? 'gif' : null
}
