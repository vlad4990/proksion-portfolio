// Публичный URL медиа (docs/architecture.md §5): чистая строковая сборка ключа MinIO,
// БЕЗ обращения к S3. Снаружи картинки отдаёт Caddy: /media/* → reverse_proxy minio:9000.
//
//   image.key_base = images/{workId}/{imageId}
//   URL варианта   = /media/{key_base}/{variant}.{ext}

/** Размерные варианты, генерируемые пайплайном задачи 04 (thumb — листинг, full — модалка). */
export const IMAGE_VARIANTS = ['thumb', 'full'] as const
/** Форматы: AVIF/WebP + JPEG-fallback для <picture> на фронте (§5). */
export const IMAGE_FORMATS = ['avif', 'webp', 'jpg'] as const

export type ImageVariant = (typeof IMAGE_VARIANTS)[number]
export type ImageFormat = (typeof IMAGE_FORMATS)[number]

/**
 * Носитель анимации у анимированной картинки (`image.anim`; `null` — картинка статичная):
 * - `'webp'` — кадры живут в webp-вариантах (thumb И full): играет и тайл листинга, и лента
 *   модалки;
 * - `'gif'`  — лента слишком длинная для перекодирования (или webp вышел тяжелее оригинала),
 *   поэтому анимацию отдаёт исходный GIF под ключом `full.gif`, и играет она ТОЛЬКО в
 *   открытой работе: webp-варианты в этой ветке — статичный первый кадр, тайл листинга
 *   остаётся неподвижным (перекодированный thumb такого GIF'а весит мегабайты, а тайлов
 *   на экране десятки).
 *
 * AVIF из списка анимации исключён сознательно: libheif в sharp кодирует только один кадр,
 * и `<source type="image/avif">` молча убил бы анимацию (браузер выбирает первый поддержанный
 * источник) — поэтому у анимированных картинок фронт avif не предлагает вовсе.
 */
export const IMAGE_ANIMS = ['webp', 'gif'] as const
export type ImageAnim = (typeof IMAGE_ANIMS)[number]

/** URL'ы одного размерного варианта во всех форматах (`gif` — только у `anim: 'gif'` + full). */
export type VariantUrls = Record<ImageFormat, string> & { gif?: string }
/** Полный блок вариантов картинки: thumb/full × avif/webp/jpg (+ full.gif у GIF-анимаций). */
export type ImageVariants = Record<ImageVariant, VariantUrls>

/**
 * Чистая сборка публичного URL: `/media/{keyBase}/{variant}.{ext}`.
 * Никакой нормализации/валидации и никаких запросов в MinIO — только конкатенация.
 */
export function mediaUrl(keyBase: string, variant: string, ext: string): string {
  return `/media/${keyBase}/${variant}.${ext}`
}

/**
 * Собирает весь блок вариантов (thumb/full × avif/webp/jpg) для картинки по её `key_base`.
 * У картинки с `anim: 'gif'` в full добавляется `gif` — оригинальная лента кадров.
 */
export function imageVariants(keyBase: string, anim: ImageAnim | null = null): ImageVariants {
  const out = {} as ImageVariants
  for (const variant of IMAGE_VARIANTS) {
    const urls = {} as VariantUrls
    for (const format of IMAGE_FORMATS) urls[format] = mediaUrl(keyBase, variant, format)
    out[variant] = urls
  }
  if (anim === 'gif') out.full.gif = mediaUrl(keyBase, 'full', 'gif')
  return out
}
