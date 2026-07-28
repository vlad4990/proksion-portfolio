// Канонические ссылки листинга (спека редизайна §5.6) — один источник для обоих деревьев.
// Работа ВСЕГДА открывается по слаговому пути с подкатегорией: /projects/:cat/:sub/:work.

import type { Tile } from '../api/types'

/** Канонический URL модалки работы (слаги приходят в самом тайле). */
export function workHref(work: Pick<Tile, 'cat' | 'sub' | 'slug'>): string {
  return `/projects/${work.cat}/${work.sub}/${work.slug}`
}

/** Страница категории (таб «ВСЕ»); `?tag=` туда не переносим — фильтр живёт на корневой. */
export function categoryHref(cat: string): string {
  return `/projects/${cat}`
}

/** Корневая с активным тегом-фильтром (пустой слаг — просто /projects). */
export function tagHref(slug?: string | undefined): string {
  return slug ? `/projects?tag=${encodeURIComponent(slug)}` : '/projects'
}
