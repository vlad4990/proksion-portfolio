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

/** URL'ы одного размерного варианта во всех форматах. */
export type VariantUrls = Record<ImageFormat, string>
/** Полный блок вариантов картинки: thumb/full × avif/webp/jpg. */
export type ImageVariants = Record<ImageVariant, VariantUrls>

/**
 * Чистая сборка публичного URL: `/media/{keyBase}/{variant}.{ext}`.
 * Никакой нормализации/валидации и никаких запросов в MinIO — только конкатенация.
 */
export function mediaUrl(keyBase: string, variant: string, ext: string): string {
  return `/media/${keyBase}/${variant}.${ext}`
}

/** Собирает весь блок вариантов (thumb/full × avif/webp/jpg) для картинки по её `key_base`. */
export function imageVariants(keyBase: string): ImageVariants {
  const out = {} as ImageVariants
  for (const variant of IMAGE_VARIANTS) {
    const urls = {} as VariantUrls
    for (const format of IMAGE_FORMATS) urls[format] = mediaUrl(keyBase, variant, format)
    out[variant] = urls
  }
  return out
}
