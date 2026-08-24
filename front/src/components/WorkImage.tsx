// Картинка ленты модалки работы (спека §5/§8) — общий лист для обоих деревьев.
// `<picture>` с источниками AVIF → WebP → JPEG-fallback; на время загрузки full-картинки
// виден фон-плейсхолдер (thumb тайла из кэша / LQIP / нейтральный тон), затем картинка
// плавно проявляется. Брендово-нейтрален: ни цветов, ни размеров не хардкодит — стили
// приходят классами из дерева.
//
// Загрузку отслеживаем НАТИВНЫМ listener'ом + проверкой `complete` в эффекте: реактовский
// onLoad терял событие (на проде картинка навсегда оставалась в opacity:0 при complete=true),
// а нативная подписка покрывает оба порядка «load до/после эффекта».

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { ImageDetail } from '../api/types'

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
  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const el = imgRef.current
    if (!el) return
    if (el.complete) {
      setLoaded(true)
      return
    }
    const onDone = () => setLoaded(true)
    el.addEventListener('load', onDone)
    // При ошибке тоже показываем <img> (сломанная иконка честнее вечного блюра).
    el.addEventListener('error', onDone)
    return () => {
      el.removeEventListener('load', onDone)
      el.removeEventListener('error', onDone)
    }
  }, [])

  const placeholder = placeholderSrc ?? image.lqip
  const pictureStyle: CSSProperties = {
    aspectRatio: `${image.w} / ${image.h}`,
    ...(placeholder ? { backgroundImage: `url("${placeholder}")` } : {}),
  }

  return (
    <picture className={className} style={pictureStyle} data-test="work-picture">
      <source type="image/avif" srcSet={image.variants.full.avif} />
      <source type="image/webp" srcSet={image.variants.full.webp} />
      <img
        ref={imgRef}
        src={image.variants.full.jpg}
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
