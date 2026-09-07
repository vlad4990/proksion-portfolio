// FLIP-источник модалки работы. Делегированный capture-слушатель кликов запоминает
// СНИМОК картинки тайла (rect/thumb/аспект на момент клика) — модалка стартует анимацию
// открытия из этой геометрии (iOS/app-store-паттерн). Снимок, а не живой узел: переход на
// модальный маршрут ремоунтит листинг под модалкой (другой Route + пересборка masonry),
// и DOM-узел тайла к layout-effect'у модалки может быть уже мёртв — а его пиксели на
// экране ещё прежние, так что склейка по снимку бесшовна. Для ОБРАТНОГО полёта при
// закрытии живой тайл ищется заново по канонической ссылке (findLiveTile).
// Один слушатель покрывает ВСЕ ссылки на работы в обоих деревьях — без правок разметки.
//
// Снимок учитывает transform стопки hover-«веера» (desktop/WorkLink): по клику ссылка
// масштабирована, а обложка сдвинута и повёрнута. bbox повёрнутого элемента раздут, поэтому
// геометрия считается как визуальный прямоугольник + угол (см. coverGeometry) — модалка
// стартует ровно из повёрнутой обложки, без рывка.

export interface FlipSource {
  /** Слаг (или легаси-id) работы из href — модалка сверяет со своим URL-параметром. */
  slug: string
  /** Канонический pathname ссылки — поиск живого тайла при закрытии. */
  path: string
  /** Визуальный прямоугольник картинки тайла на момент клика — БЕЗ поворота (см. `rot`). */
  rect: DOMRect
  /** Поворот картинки в градусах (обложка в раздвинутом веере); 0 — обычный тайл. */
  rot: number
  /** currentSrc thumb — формат уже в кэше браузера; фон-плейсхолдер первой картинки. */
  src: string
  /** Аспект картинки (natural, иначе из rect) — скелетон/ширина колонки до загрузки детали. */
  ar: number | null
}

let source: FlipSource | null = null

/** Путь работы: /projects/:cat/:sub/:work — ровно 4 сегмента. */
const WORK_PATH = /^\/projects\/[^/]+\/[^/]+\/[^/]+\/?$/

/** Слаги пути работы из URL модалки. */
export interface WorkPath {
  cat: string
  sub: string
  work: string
  pathname: string
}

/** Ссылка на работу (`/projects/:cat/:sub/:work` того же origin) → её слаги, иначе null. */
export function parseWorkLink(el: Element | null): WorkPath | null {
  const link = el?.closest('a[href]')
  if (!(link instanceof HTMLAnchorElement)) return null
  let url: URL
  try {
    url = new URL(link.href, window.location.origin)
  } catch {
    return null
  }
  if (url.origin !== window.location.origin || !WORK_PATH.test(url.pathname)) return null
  const seg = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
  const [, cat, sub, work] = seg
  if (!cat || !sub || !work) return null
  return { cat, sub, work, pathname: url.pathname }
}

/** Аспект картинки: натуральные размеры, а до декодирования — фактический rect. */
function imageAspect(img: HTMLImageElement, rect: DOMRect): number | null {
  if (img.naturalHeight > 0) return img.naturalWidth / img.naturalHeight
  return rect.height > 0 ? rect.width / rect.height : null
}

/**
 * Визуальная геометрия обложки. Ссылка может быть масштабирована (hover-веер: scale на <a>),
 * а сама обложка (<picture>) — сдвинута и повёрнута; bbox повёрнутого элемента раздут
 * (≈+8% при 7°). Поэтому: размер = layout-размер × масштаб ссылки (ссылка не повёрнута —
 * её bbox честный), центр = центр bbox картинки (поворот центр сохраняет), угол — из
 * computed transform обложки; верхний-левый угол = центр + поворот вектора (−w/2, −h/2).
 * Без ховера всё вырождается в обычный getBoundingClientRect (scale 1, угол 0).
 */
function coverGeometry(anchor: Element, img: HTMLImageElement): { rect: DOMRect; rot: number } {
  const bbox = img.getBoundingClientRect()
  const scale = anchor instanceof HTMLElement && anchor.offsetWidth > 0
    ? anchor.getBoundingClientRect().width / anchor.offsetWidth
    : 1
  const w = img.offsetWidth * scale
  const h = img.offsetHeight * scale
  if (w <= 0 || h <= 0) return { rect: bbox, rot: 0 }
  const picture = img.closest('picture') ?? img
  const transform = getComputedStyle(picture).transform
  const m = transform && transform !== 'none' ? new DOMMatrix(transform) : null
  const theta = m ? Math.atan2(m.b, m.a) : 0
  const cx = bbox.left + bbox.width / 2
  const cy = bbox.top + bbox.height / 2
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  const left = cx + (-w / 2) * cos - (-h / 2) * sin
  const top = cy + (-w / 2) * sin + (-h / 2) * cos
  return { rect: new DOMRect(left, top, w, h), rot: (theta * 180) / Math.PI }
}

function onClickCapture(e: MouseEvent): void {
  const target = e.target instanceof Element ? e.target : null
  const path = parseWorkLink(target)
  if (!path) return
  const anchor = target?.closest('a[href]')
  const img = anchor?.querySelector('img')
  if (!anchor || !img) return
  const { rect, rot } = coverGeometry(anchor, img)
  if (rect.width <= 0 || rect.height <= 0) return
  source = {
    slug: path.work,
    path: path.pathname,
    rect,
    rot,
    src: img.currentSrc || img.src,
    ar: imageAspect(img, rect),
  }
}

/** Вешает слушатель на документ (capture-фаза — раньше обработчиков react-router). */
export function installFlipCapture(): () => void {
  document.addEventListener('click', onClickCapture, true)
  return () => document.removeEventListener('click', onClickCapture, true)
}

/**
 * Снимок для работы `slug`, если модалку открыли кликом именно по её тайлу
 * (иначе null → деградация до появления без FLIP: deep-link, forward-навигация).
 */
export function getFlipSource(slug: string | undefined): FlipSource | null {
  if (!slug || !source || source.slug !== slug) return null
  return source
}

/**
 * Живая картинка тайла этой работы в ТЕКУЩЕМ листинге под модалкой — цель обратного
 * полёта при закрытии. Ищем по каноническому pathname ссылки (узел из снимка к этому
 * моменту почти наверняка пересоздан реконсиляцией листинга).
 */
export function findLiveTile(path: string): HTMLImageElement | null {
  for (const a of Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
    let url: URL
    try {
      url = new URL(a.href, window.location.origin)
    } catch {
      continue
    }
    if (url.pathname !== path) continue
    const img = a.querySelector('img')
    if (img && img.isConnected) return img
  }
  return null
}
