// Картинка тайла листинга / слота витрины — общий лист для обоих деревьев.
// `<picture>` с источниками AVIF → WebP → JPEG-fallback; пока thumb грузится, на `<picture>`
// виден скелетон-тон (CSS дерева, селектор `:not([data-loaded])`), после загрузки атрибут
// `data-loaded` его гасит: у работ бывают PNG с прозрачным фоном, и оставленный тон
// `--c-skeleton` просвечивал бы сквозь прозрачные зоны молочной дымкой.
//
// Брендово-нейтрален: ни цветов, ни размеров не хардкодит — стили приходят классами.

import { useRef } from 'react'
import type { VariantUrls } from '../api/types'
import { useImageLoaded } from '../lib/useImageLoaded'

interface TileImageProps {
  /** URL'ы thumb во всех форматах (avif/webp/jpg). */
  variants: VariantUrls
  /** Класс на `<picture>` (несёт скелетон-фон до загрузки). */
  className?: string
  /** Класс на `<img>` (object-fit, размеры). */
  imgClassName?: string
  /** Пропорции на `<img>` (`w / h`) — тайлы masonry; слоты витрин несут их на ссылке. */
  aspectRatio?: string
  /** Первый экран: eager-загрузка + высокий приоритет. */
  eager?: boolean
  alt?: string
}

export function TileImage({
  variants,
  className,
  imgClassName,
  aspectRatio,
  eager = false,
  alt = '',
}: TileImageProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  // Ключ состояния — URL источника: смена картинки в том же узле возвращает скелетон.
  const loaded = useImageLoaded(imgRef, variants.jpg)

  return (
    <picture className={className} {...(loaded ? { 'data-loaded': '' } : {})}>
      <source type="image/avif" srcSet={variants.avif} />
      <source type="image/webp" srcSet={variants.webp} />
      <img
        ref={imgRef}
        src={variants.jpg}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className={imgClassName}
        {...(aspectRatio ? { style: { aspectRatio } } : {})}
        {...(eager ? { fetchpriority: 'high' } : {})}
      />
    </picture>
  )
}
