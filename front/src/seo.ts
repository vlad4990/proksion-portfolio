// Заголовки вкладки (document.title) — единственный источник строк для App.tsx
// (top-level разделы) и useWorkModal (название открытой работы с возвратом при закрытии).
// Должны совпадать по духу с <title>/og:title в index.html.

import type { Route } from './types'

export const SITE_TITLE = 'PROKSION — Kristina · портфолио'

export const ROUTE_TITLES: Record<Route, string> = {
  home: SITE_TITLE,
  projects: 'Проекты — PROKSION',
  contacts: 'Контакты — PROKSION',
}

/** Заголовок вкладки для открытой в модалке работы. */
export function workTitle(title: string | null): string {
  return `${title ?? 'Работа'} — PROKSION`
}
