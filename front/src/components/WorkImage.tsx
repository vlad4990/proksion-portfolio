// Картинка слайда карусели (задача 10, спека §5/§8) — общий лист для обоих деревьев.
// `<picture>` с источниками AVIF → WebP → JPEG-fallback; на время загрузки full-картинки
// виден LQIP-фон (или нейтральный тон-скелетон), затем картинка плавно проявляется.
// Брендово-нейтрален: ни цветов, ни размеров не хардкодит — стили приходят классами из дерева.
//
// Родитель монтирует <WorkImage key={image.id} …>: смена слайда = свежий монтаж →
// состояние loaded сбрасывается, LQIP снова виден. Загрузку отслеживаем НАТИВНЫМ
// listener'ом + проверкой `complete` в эффекте: реактовский onLoad терял событие
// (на проде картинка навсегда оставалась в opacity:0 при complete=true), а нативная
// подписка покрывает оба порядка «load до/после эффекта».

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { ImageDetail } from '../api/types'

interface WorkImageProps {
  image: ImageDetail
  /** Класс на контейнер `<picture>` (раскладка/фон-скелетон). */
  className?: string
  /** Класс на `<img>` (object-fit и т.п.). */
  imgClassName?: string
}

/**
 * Скрытый прелоадер соседнего слайда: тот же `<picture>` avif/webp/jpg, что и у видимого
 * слайда, — браузер сам выбирает и скачивает ПРАВИЛЬНЫЙ формат в кэш (голый `new Image()`
 * знал бы только jpg). Модалки рендерят его для next/prev — листание мгновенное.
 */
export function PreloadImage({ image }: { image: ImageDetail }) {
  return (
    <picture hidden aria-hidden="true" data-test="work-preload">
      <source type="image/avif" srcSet={image.variants.full.avif} />
      <source type="image/webp" srcSet={image.variants.full.webp} />
      <img src={image.variants.full.jpg} alt="" />
    </picture>
  )
}

export function WorkImage({ image, className, imgClassName }: WorkImageProps) {
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

  const pictureStyle: CSSProperties = {
    aspectRatio: `${image.w} / ${image.h}`,
    ...(image.lqip ? { backgroundImage: `url("${image.lqip}")` } : {}),
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
        className={imgClassName}
        style={{ opacity: loaded ? 1 : 0 }}
        data-test="work-image"
      />
    </picture>
  )
}
