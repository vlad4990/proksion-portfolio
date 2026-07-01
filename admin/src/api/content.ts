// Типизированные обёртки контент-API админки поверх `api` (src/api/client.ts).
// READ — публичные эндпоинты задачи 03 (без авторизации); WRITE/reorder — admin-CRUD задачи 06
// (под guard + CSRF, клиент уже шлёт credentials + X-Requested-With). Контракты — стабильные,
// не меняем (см. docs/architecture.md §7). Слаги в пути экранируются.

import { api } from './client'
import type {
  CategoryNav,
  CategoryRow,
  ImageRow,
  OkResponse,
  SubcategoryListing,
  SubcategoryRow,
  WorkDetail,
  WorkRow,
} from './types'

const enc = encodeURIComponent

// ── READ (публичный API, задача 03) ───────────────────────────────────────────────────

/** Все категории + вложенные подкатегории со счётчиками работ. Источник правды дерева контента. */
export const getCategories = (signal?: AbortSignal): Promise<CategoryNav[]> =>
  api.get<CategoryNav[]>('/categories', signal)

/** Одна категория по слагу + её подкатегории (для экрана подкатегорий). */
export const getCategory = (catSlug: string, signal?: AbortSignal): Promise<CategoryNav> =>
  api.get<CategoryNav>(`/categories/${enc(catSlug)}`, signal)

/** Листинг подкатегории: контекст (категория/подкатегория) + тайлы работ. */
export const getSubcategoryListing = (
  catSlug: string,
  subSlug: string,
  signal?: AbortSignal,
): Promise<SubcategoryListing> =>
  api.get<SubcategoryListing>(`/categories/${enc(catSlug)}/${enc(subSlug)}`, signal)

/** Полная работа: описание + cover + упорядоченные картинки (варианты/alt/размеры). */
export const getWorkDetail = (
  catSlug: string,
  subSlug: string,
  workSlug: string,
  signal?: AbortSignal,
): Promise<WorkDetail> =>
  api.get<WorkDetail>(`/works/${enc(catSlug)}/${enc(subSlug)}/${enc(workSlug)}`, signal)

// ── Категории (admin-CRUD) ─────────────────────────────────────────────────────────────

export interface CategoryInput {
  title: string
  slug?: string
  description?: string | null
}

export const createCategory = (input: CategoryInput): Promise<CategoryRow> =>
  api.post<CategoryRow>('/admin/categories', input)

export const updateCategory = (
  id: number,
  patch: Partial<CategoryInput>,
): Promise<CategoryRow> => api.patch<CategoryRow>(`/admin/categories/${id}`, patch)

export const deleteCategory = (id: number): Promise<OkResponse> =>
  api.delete<OkResponse>(`/admin/categories/${id}`)

// ── Подкатегории (admin-CRUD) ──────────────────────────────────────────────────────────

export interface SubcategoryInput {
  category_id: number
  title: string
  slug?: string
  description?: string | null
}

export const createSubcategory = (input: SubcategoryInput): Promise<SubcategoryRow> =>
  api.post<SubcategoryRow>('/admin/subcategories', input)

export const updateSubcategory = (
  id: number,
  patch: Partial<Omit<SubcategoryInput, 'category_id'>>,
): Promise<SubcategoryRow> => api.patch<SubcategoryRow>(`/admin/subcategories/${id}`, patch)

export const deleteSubcategory = (id: number): Promise<OkResponse> =>
  api.delete<OkResponse>(`/admin/subcategories/${id}`)

// ── Работы (admin-CRUD) ────────────────────────────────────────────────────────────────

export interface WorkInput {
  subcategory_id: number
  title?: string | null
  slug?: string
  description?: string | null
}

export interface WorkPatchInput {
  title?: string | null
  slug?: string
  description?: string | null
  cover_image_id?: number | null
}

export const createWork = (input: WorkInput): Promise<WorkRow> =>
  api.post<WorkRow>('/admin/works', input)

export const updateWork = (id: number, patch: WorkPatchInput): Promise<WorkRow> =>
  api.patch<WorkRow>(`/admin/works/${id}`, patch)

export const deleteWork = (id: number): Promise<OkResponse> =>
  api.delete<OkResponse>(`/admin/works/${id}`)

// ── Картинки (admin-CRUD; загрузка — отдельный multipart-модуль upload.ts) ───────────────

export interface ImagePatchInput {
  alt?: string | null
  sort_order?: number
}

export const updateImage = (id: number, patch: ImagePatchInput): Promise<ImageRow> =>
  api.patch<ImageRow>(`/admin/images/${id}`, patch)

export const deleteImage = (id: number): Promise<OkResponse> =>
  api.delete<OkResponse>(`/admin/images/${id}`)

// ── Reorder (admin-CRUD): упорядоченный список id → sort_order = позиция ──────────────────

export const reorderCategories = (ids: number[]): Promise<OkResponse> =>
  api.patch<OkResponse>('/admin/categories/reorder', { ids })

export const reorderSubcategories = (ids: number[]): Promise<OkResponse> =>
  api.patch<OkResponse>('/admin/subcategories/reorder', { ids })

export const reorderWorks = (ids: number[]): Promise<OkResponse> =>
  api.patch<OkResponse>('/admin/works/reorder', { ids })

export const reorderImages = (ids: number[]): Promise<OkResponse> =>
  api.patch<OkResponse>('/admin/images/reorder', { ids })
