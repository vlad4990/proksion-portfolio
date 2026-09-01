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

/** Таб подкатегории на странице категории — тот же экран, состояние в URL. */
export function subcategoryHref(cat: string, sub: string): string {
  return `/projects/${cat}/${sub}`
}

/** Корневая с активным тегом-фильтром (пустой слаг — просто /projects). */
export function tagHref(slug?: string | undefined): string {
  return slug ? `/projects?tag=${encodeURIComponent(slug)}` : '/projects'
}

/** Путь модалки работы: `/projects/:cat/:sub/:work` (4 сегмента). */
export function isWorkPath(pathname: string): boolean {
  const seg = pathname.split('/').filter(Boolean)
  return seg[0] === 'projects' && seg.length === 4
}
