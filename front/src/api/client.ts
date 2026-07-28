// Тонкие fetch-обёртки над публичным API (docs/architecture.md §7, §8).
// База — `/api` (в dev проксируется на back :3001, в проде Caddy `handle_path /api/*`).
// Только чтение; мутации — задача админки. Ошибки нормализуем в ApiError, чтобы UI
// показал состояние «ошибка», а не белый экран.

import type {
  CategoryDetail,
  CategoryNav,
  FeaturedSection,
  SubcategoryListing,
  TagNav,
  WorkDetail,
  WorkDetailById,
  WorksPage,
} from './types'

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

/** Одна категория: навигационная форма + `description_long` (страница категории, §5.2). */
export function getCategory(cat: string): Promise<CategoryDetail> {
  return getJson<CategoryDetail>(`/categories/${encodeURIComponent(cat)}`)
}

/** Глобальные теги-фильтры чипов корневой `/projects` со счётчиками (§5.3). */
export function getTags(): Promise<TagNav[]> {
  return getJson<TagNav[]>('/tags')
}

/** Витрины секций корневой `/projects` — кураторский список либо fallback (§5.3). */
export function getFeatured(): Promise<FeaturedSection[]> {
  return getJson<FeaturedSection[]>('/featured')
}

/** Подкатегория + её тайлы работ (`/projects/:cat/:sub`). */
export function getSubcategoryListing(cat: string, sub: string): Promise<SubcategoryListing> {
  return getJson<SubcategoryListing>(`/categories/${encodeURIComponent(cat)}/${encodeURIComponent(sub)}`)
}

/** Глобальный листинг всех работ (`/projects`), offset/limit-пагинация. */
export function getWorks(offset = 0, limit = 60): Promise<WorksPage> {
  return getJson<WorksPage>(`/works?offset=${offset}&limit=${limit}`)
}

/** Параметры фильтрованного листинга `/works` (§5.4). `subcategory` требует `category`. */
export interface WorksQuery {
  category?: string | undefined
  subcategory?: string | undefined
  tag?: string | undefined
  offset?: number | undefined
  limit?: number | undefined
}

/**
 * Листинг работ с фильтрами + SQL-пагинация (§5.4): порция инфинити-скролла.
 * Неизвестный слаг фильтра — не ошибка, а пустая страница (`total: 0`).
 */
export function getWorksFiltered(params: WorksQuery = {}): Promise<WorksPage> {
  const query = new URLSearchParams()
  if (params.category) query.set('category', params.category)
  if (params.subcategory) query.set('subcategory', params.subcategory)
  if (params.tag) query.set('tag', params.tag)
  if (params.offset !== undefined) query.set('offset', String(params.offset))
  if (params.limit !== undefined) query.set('limit', String(params.limit))
  const qs = query.toString()
  return getJson<WorksPage>(qs ? `/works?${qs}` : '/works')
}

/**
 * Полная работа ПО ID для модалки (задача 10, вариант B): описание + картинки карусели +
 * слаги пути `cat`/`sub`. Сегмент `:work` в URL модалки — это id (не slug). Несуществующий/
 * невалидный id → ApiError со `status` 404 (UI редиректит на листинг, см. useWorkDetail).
 */
export function getWorkById(id: number | string): Promise<WorkDetailById> {
  return getJson<WorkDetailById>(`/works/by-id/${encodeURIComponent(String(id))}`)
}

/**
 * Полная работа ПО СЛАГУ — канонический источник детали модалки (§5.6):
 * `/projects/:cat/:sub/:work`, где `:work` — слаг работы. Ответ без `cat`/`sub`
 * (они и так в URL). Несуществующий слаг → ApiError 404.
 */
export function getWorkBySlug(cat: string, sub: string, work: string): Promise<WorkDetail> {
  return getJson<WorkDetail>(
    `/works/${encodeURIComponent(cat)}/${encodeURIComponent(sub)}/${encodeURIComponent(work)}`,
  )
}
