// Фоновый прогрев работы ДО открытия модалки: ховер/тап/фокус по ссылке работы →
// префетч детали (в сессионный кэш useWorkDetail) + прогрев full-варианта первой картинки
// скрытым <picture> (браузер сам выбирает и качает СВОЙ формат avif/webp/jpg в HTTP-кэш).
// Итог: клик по тайлу открывает модалку из кэша, полная картинка уже локально —
// никакой пустоты/LQIP-блюра при открытии. Ошибки глотаются — это только оптимизация.

import { prefetchWorkDetail } from '../api/useWorkDetail'
import { parseWorkLink } from './flip'
import type { WorkDetail } from '../api/types'

/** id картинок, чей full уже прогрет (или прогревается) — второй <picture> не плодим. */
const warmed = new Set<number>()

/** Прогрев full первой картинки работы скрытым <picture> (см. комментарий модуля). */
function warmFirstImage(detail: WorkDetail | null): void {
  const img = detail?.images[0]
  if (!img || warmed.has(img.id)) return
  warmed.add(img.id)
  const pic = document.createElement('picture')
  pic.hidden = true
  pic.dataset['test'] = 'work-preload'
  const avif = document.createElement('source')
  avif.type = 'image/avif'
  avif.srcset = img.variants.full.avif
  const webp = document.createElement('source')
  webp.type = 'image/webp'
  webp.srcset = img.variants.full.webp
  const el = document.createElement('img')
  el.decoding = 'async'
  el.src = img.variants.full.jpg
  const done = (): void => pic.remove() // файл уже в HTTP-кэше, узел больше не нужен
  el.addEventListener('load', done)
  el.addEventListener('error', done)
  pic.append(avif, webp, el)
  document.body.append(pic)
}

function onWarmEvent(e: Event): void {
  const path = parseWorkLink(e.target instanceof Element ? e.target : null)
  if (!path) return
  void prefetchWorkDetail(path.cat, path.sub, path.work).then(warmFirstImage)
}

/**
 * Вешает делегированные слушатели прогрева на документ: `pointerover` (ховер десктопа),
 * `touchstart` (тап начинается раньше click) и `focusin` (клавиатурная навигация).
 * Снятие — возврат.
 */
export function installWorkPrefetch(): () => void {
  document.addEventListener('pointerover', onWarmEvent, { passive: true })
  document.addEventListener('touchstart', onWarmEvent, { passive: true })
  document.addEventListener('focusin', onWarmEvent)
  return () => {
    document.removeEventListener('pointerover', onWarmEvent)
    document.removeEventListener('touchstart', onWarmEvent)
    document.removeEventListener('focusin', onWarmEvent)
  }
}
