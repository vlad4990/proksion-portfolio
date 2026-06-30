// Тонкие fetch-обёртки над публичным API (docs/architecture.md §7, §8).
// База — `/api` (в dev проксируется на back :3001, в проде Caddy `handle_path /api/*`).
// Только чтение; мутации — задача админки. Ошибки нормализуем в ApiError, чтобы UI
// показал состояние «ошибка», а не белый экран.

import type { CategoryNav, SubcategoryListing, WorksPage } from './types'

/** Базовый префикс публичного API (срезается Caddy/прокси перед бэкендом). */
export const API_BASE = '/api'

/** Ошибка обращения к API (сеть или не-2xx ответ). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function getJson<T>(path: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, { headers: { Accept: 'application/json' } })
  } catch {
    throw new ApiError(`Сеть недоступна: ${path}`, undefined)
  }
  if (!res.ok) throw new ApiError(`Запрос не удался: ${path}`, res.status)
  return (await res.json()) as T
}

/** Все категории с подкатегориями и счётчиками — для навигации листинга. */
export function getCategories(): Promise<CategoryNav[]> {
  return getJson<CategoryNav[]>('/categories')
}

/** Подкатегория + её тайлы работ (`/projects/:cat/:sub`). */
export function getSubcategoryListing(cat: string, sub: string): Promise<SubcategoryListing> {
  return getJson<SubcategoryListing>(`/categories/${encodeURIComponent(cat)}/${encodeURIComponent(sub)}`)
}

/** Глобальный листинг всех работ (`/projects`), offset/limit-пагинация. */
export function getWorks(offset = 0, limit = 60): Promise<WorksPage> {
  return getJson<WorksPage>(`/works?offset=${offset}&limit=${limit}`)
}
