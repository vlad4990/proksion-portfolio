// Флаг «<img> декодирована» — для плейсхолдеров под картинкой (скелетон-тон, LQIP, thumb
// тайла). Как только картинка на экране, плейсхолдер надо СНЯТЬ: у работ бывают PNG с
// прозрачным фоном, и оставленный под ними тон `--c-skeleton` (10% белого) просвечивает
// сквозь прозрачные зоны молочной дымкой.
//
// Загрузку отслеживаем НАТИВНЫМ listener'ом + проверкой `complete` в эффекте: реактовский
// onLoad терял событие (на проде картинка навсегда оставалась в opacity:0 при complete=true),
// а нативная подписка покрывает оба порядка «load до/после эффекта».
//
// Состояние привязано к `srcKey` (URL источника), а не к жизни экземпляра: если тот же узел
// получит другую картинку (позиционное переиспользование — напр. hero-слот витрины рендерится
// без key), флаг сбрасывается тем же рендером и скелетон возвращается на время загрузки.

import { useEffect, useState, type RefObject } from 'react'

/** `true`, когда картинка `srcKey` по ref загружена (или упала — плейсхолдер всё равно снимаем). */
export function useImageLoaded(ref: RefObject<HTMLImageElement>, srcKey: string): boolean {
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (el.complete) {
      setLoadedKey(srcKey)
      return
    }
    const onDone = () => setLoadedKey(srcKey)
    el.addEventListener('load', onDone)
    // При ошибке тоже показываем <img> (сломанная иконка честнее вечного блюра).
    el.addEventListener('error', onDone)
    return () => {
      el.removeEventListener('load', onDone)
      el.removeEventListener('error', onDone)
    }
  }, [ref, srcKey])

  return loadedKey === srcKey
}
