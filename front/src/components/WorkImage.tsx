// Картинка слайда карусели (задача 10, спека §5/§8) — общий лист для обоих деревьев.
// `<picture>` с источниками AVIF → WebP → JPEG-fallback; на время загрузки full-картинки
// виден LQIP-фон (или нейтральный тон-скелетон), затем картинка плавно проявляется.
// Брендово-нейтрален: ни цветов, ни размеров не хардкодит — стили приходят классами из дерева.
//
// Родитель монтирует <WorkImage key={image.id} …>: смена слайда = свежий монтаж →
// состояние loaded сбрасывается, LQIP снова виден. `complete`-проверка покрывает кэш.

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { ImageDetail } from '../api/types'

interface WorkImageProps {
  image: ImageDetail
  /** Класс на контейнер `<picture>` (раскладка/фон-скелетон). */
  className?: string
  /** Класс на `<img>` (object-fit и т.п.). */
  imgClassName?: string
}

export function WorkImage({ image, className, imgClassName }: WorkImageProps) {
  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Картинка могла прийти из кэша до навешивания onLoad — синхронизируем по `complete`.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true)
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
        onLoad={() => setLoaded(true)}
        className={imgClassName}
        style={{ opacity: loaded ? 1 : 0 }}
        data-test="work-image"
      />
    </picture>
  )
}
