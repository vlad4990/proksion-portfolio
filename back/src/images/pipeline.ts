// Пайплайн обработки картинок (docs/architecture.md §6). Чистая граница: ЗНАЕТ только про
// байты и sharp, НЕ знает про S3/БД (склейку делает store.ts). На вход — буфер оригинала,
// на выход — натуральные w/h, варианты thumb/full × avif/webp/jpg и LQIP-плейсхолдер.
//
// sharp поднимается под Bun на oven/bun:1 (glibc) с нативным libvips — проверено в задаче 04
// (`sharp.versions`), fallback на @napi-rs/image НЕ потребовался.

import sharp from 'sharp'
import {
  IMAGE_FORMATS,
  IMAGE_VARIANTS,
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

/** Байты одного размерного варианта во всех форматах. */
export type VariantBytes = Record<ImageFormat, Uint8Array>
/** Полный набор сгенерированных вариантов: thumb/full × avif/webp/jpg. */
export type ProcessedVariants = Record<ImageVariant, VariantBytes>

export interface ProcessedImage {
  /** Натуральная ширина оригинала (для aspect-ratio на фронте). */
  width: number
  /** Натуральная высота оригинала. */
  height: number
  /** Закодированные варианты (байты), готовые к заливке в MinIO. */
  variants: ProcessedVariants
  /** Крошечный blur-плейсхолдер как data-URI (`data:image/webp;base64,…`). */
  lqip: string
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
 * 1) читает натуральные `width/height`;
 * 2) генерирует thumb (~800px) и full (~2000px) — каждый в avif/webp/jpg (`fit: inside`,
 *    без апскейла: вариант не больше оригинала);
 * 3) собирает крошечный blur-LQIP в base64.
 *
 * Бросает, если у входа нет валидных размеров (битый/не-картинка).
 */
export async function processImage(
  input: Uint8Array | ArrayBuffer | Buffer,
): Promise<ProcessedImage> {
  // Один декод оригинала; `clone()` ветвит конвейер на каждый выход (one-input→many-output).
  const source = sharp(input, { failOn: 'none' })
  const meta = await source.metadata()
  if (!meta.width || !meta.height) {
    throw new Error('pipeline: input has no decodable dimensions')
  }

  const variants = {} as ProcessedVariants
  for (const variant of IMAGE_VARIANTS) {
    const edge = VARIANT_MAX_EDGE[variant]
    const bytes = {} as VariantBytes
    for (const format of IMAGE_FORMATS) {
      const resized = source
        .clone()
        .resize(edge, edge, { fit: 'inside', withoutEnlargement: true })
      bytes[format] = new Uint8Array(await encode(resized, format))
    }
    variants[variant] = bytes
  }

  const lqipBuffer = await source
    .clone()
    .resize(LQIP_EDGE, LQIP_EDGE, { fit: 'inside', withoutEnlargement: true })
    .blur(LQIP_BLUR)
    .webp({ quality: 40 })
    .toBuffer()
  const lqip = `data:image/webp;base64,${lqipBuffer.toString('base64')}`

  return { width: meta.width, height: meta.height, variants, lqip }
}
