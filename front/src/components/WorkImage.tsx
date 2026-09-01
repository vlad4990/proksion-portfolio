// Картинка ленты модалки работы (спека §5/§8) — общий лист для обоих деревьев.
// `<picture>` с источниками AVIF → WebP → JPEG-fallback; на время загрузки full-картинки
// виден фон-плейсхолдер (thumb тайла из кэша / LQIP / нейтральный тон), затем картинка
// плавно проявляется. Брендово-нейтрален: ни цветов, ни размеров не хардкодит — стили
// приходят классами из дерева.
//
// Плейсхолдер (LQIP/thumb + скелетон-тон из CSS по `[data-loaded]`) снимаем ПОСЛЕ проявления:
// у работ бывают PNG с прозрачным фоном, и оставленный под ними фон просвечивает сквозь
// прозрачные зоны — картинка выглядит «пережатой» с молочной дымкой вместо прозрачности.

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { ImageDetail } from '../api/types'
import { useImageLoaded } from '../lib/useImageLoaded'

/** Держим плейсхолдер чуть дольше проявления картинки (--dur-base 220ms) — без «провала» фона. */
const PLACEHOLDER_HOLD_MS = 260

interface WorkImageProps {
  image: ImageDetail
  /** Класс на контейнер `<picture>` (раскладка/фон-скелетон). */
  className?: string
  /** Класс на `<img>` (object-fit и т.п.). */
  imgClassName?: string
  /** Фон на время загрузки full: уже скачанный thumb тайла (FLIP-открытие). Без него — LQIP. */
  placeholderSrc?: string
  /** Отложенная загрузка (картинки ленты ниже первого экрана). */
  lazy?: boolean
}

export function WorkImage({ image, className, imgClassName, placeholderSrc, lazy }: WorkImageProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  // Оба состояния привязаны к URL источника: смена картинки в том же узле (позиционное
  // переиспользование) возвращает плейсхолдер, а не показывает новую картинку голой.
  const src = image.variants.full.jpg
  const loaded = useImageLoaded(imgRef, src)
  const [goneFor, setGoneFor] = useState<string | null>(null)
  const placeholderGone = goneFor === src

  useEffect(() => {
    if (!loaded) return
    const t = window.setTimeout(() => setGoneFor(src), PLACEHOLDER_HOLD_MS)
    return () => window.clearTimeout(t)
  }, [loaded, src])

  const placeholder = placeholderSrc ?? image.lqip
  const pictureStyle: CSSProperties = {
    aspectRatio: `${image.w} / ${image.h}`,
    ...(placeholder && !placeholderGone ? { backgroundImage: `url("${placeholder}")` } : {}),
  }

  return (
    <picture
      className={className}
      style={pictureStyle}
      // Атрибут гасит скелетон-тон в CSS дерева — прозрачные PNG остаются прозрачными.
      {...(placeholderGone ? { 'data-loaded': '' } : {})}
      data-test="work-picture"
    >
      <source type="image/avif" srcSet={image.variants.full.avif} />
      <source type="image/webp" srcSet={image.variants.full.webp} />
      <img
        ref={imgRef}
        src={src}
        alt={image.alt ?? ''}
        width={image.w}
        height={image.h}
        decoding="async"
        loading={lazy ? 'lazy' : undefined}
        className={imgClassName}
        style={{ opacity: loaded ? 1 : 0 }}
        data-test="work-image"
      />
    </picture>
  )
}
