// Типизированные обёртки контент-API админки поверх `api` (src/api/client.ts).
// READ — публичные эндпоинты задачи 03 (без авторизации); WRITE/reorder — admin-CRUD задачи 06
// (под guard + CSRF, клиент уже шлёт credentials + X-Requested-With). Контракты — стабильные,
// не меняем (см. docs/architecture.md §7). Слаги в пути экранируются.

import { api } from './client'
import type {
  CategoryDetail,
  CategoryNav,
  CategoryRow,
  DisplayVariant,
  FeaturedSection,
  ImageRow,
  OkResponse,
  SubcategoryListing,
  SubcategoryRow,
  TagNav,
  TagRow,
  Tile,
  WorkDetail,
  WorkRow,
  WorksPage,
} from './types'

const enc = encodeURIComponent

// ── READ (публичный API, задача 03) ───────────────────────────────────────────────────

/** Все категории + вложенные подкатегории со счётчиками работ. Источник правды дерева контента. */
export const getCategories = (signal?: AbortSignal): Promise<CategoryNav[]> =>
  api.get<CategoryNav[]>('/categories', signal)

/**
 * Одна категория по слагу: подкатегории + контентные поля секции, включая `description_long`
 * (его нет в списке `/categories`) — источник предзаполнения формы категории.
 */
export const getCategory = (catSlug: string, signal?: AbortSignal): Promise<CategoryDetail> =>
  api.get<CategoryDetail>(`/categories/${enc(catSlug)}`, signal)

/** Все теги со счётчиками видимых работ (спека редизайна §5.3) — экран «Теги» и чипы работы. */
export const getTags = (signal?: AbortSignal): Promise<TagNav[]> => api.get<TagNav[]>('/tags', signal)

/** Витрины всех категорий; `curated: false` — категория показывает fallback, а не настроенную витрину. */
export const getFeatured = (signal?: AbortSignal): Promise<FeaturedSection[]> =>
  api.get<FeaturedSection[]>('/featured', signal)

/** Максимум работ на страницу `/works` (жёсткий предел API, back/src/routes/public.ts). */
export const WORKS_PAGE_LIMIT = 100

/**
 * Все ВИДИМЫЕ работы категории (с картинками) — кандидаты в витрину. `/works` пагинирован,
 * поэтому выгребаем страницы до `total`; работ на категорию немного (обычно одна страница).
 */
export async function getWorksByCategory(
  catSlug: string,
  signal?: AbortSignal,
): Promise<Tile[]> {
  const items: Tile[] = []
  for (;;) {
    const page = await api.get<WorksPage>(
      `/works?category=${enc(catSlug)}&limit=${WORKS_PAGE_LIMIT}&offset=${items.length}`,
      signal,
    )
    items.push(...page.items)
    // Пустая страница обрывает цикл даже при рассинхроне `total` — защита от бесконечного опроса.
    if (page.items.length === 0 || items.length >= page.total) return items
  }
}

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

/**
 * Контент секции/страницы категории (редизайн §5.5). Только PATCH: POST `/admin/categories`
 * этих полей не принимает — на создании категория получает дефолты, заполняются они в форме
 * редактирования.
 */
export interface CategoryMetaInput {
  kicker?: string | null
  meta_role?: string | null
  period?: string | null
  description_long?: string | null
  display_variant?: DisplayVariant
}

export type CategoryPatchInput = Partial<CategoryInput> & CategoryMetaInput

export const createCategory = (input: CategoryInput): Promise<CategoryRow> =>
  api.post<CategoryRow>('/admin/categories', input)

export const updateCategory = (id: number, patch: CategoryPatchInput): Promise<CategoryRow> =>
  api.patch<CategoryRow>(`/admin/categories/${id}`, patch)

export const deleteCategory = (id: number): Promise<OkResponse> =>
  api.delete<OkResponse>(`/admin/categories/${id}`)

/**
 * Кураторская витрина категории: порядок массива = порядок витрины (0 = hero-тайл),
 * пустой массив очищает витрину (категория возвращается к fallback'у первых работ).
 */
export const setCategoryFeatured = (categoryId: number, workIds: number[]): Promise<OkResponse> =>
  api.patch<OkResponse>(`/admin/categories/${categoryId}/featured`, { work_ids: workIds })

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
  /** Полная замена набора тегов работы (редизайн §5.5): пустой массив снимает все теги. */
  tag_ids?: number[]
}

export const createWork = (input: WorkInput): Promise<WorkRow> =>
  api.post<WorkRow>('/admin/works', input)

export const updateWork = (id: number, patch: WorkPatchInput): Promise<WorkRow> =>
  api.patch<WorkRow>(`/admin/works/${id}`, patch)

export const deleteWork = (id: number): Promise<OkResponse> =>
  api.delete<OkResponse>(`/admin/works/${id}`)

// ── Теги (admin-CRUD, задача 15) ───────────────────────────────────────────────────────

export interface TagInput {
  title: string
  /** Необязателен: бэк сгенерит транслит-слаг из названия (занятый явный слаг → 400). */
  slug?: string
}

export const createTag = (input: TagInput): Promise<TagRow> =>
  api.post<TagRow>('/admin/tags', input)

export const updateTag = (id: number, patch: Partial<TagInput>): Promise<TagRow> =>
  api.patch<TagRow>(`/admin/tags/${id}`, patch)

export const deleteTag = (id: number): Promise<OkResponse> =>
  api.delete<OkResponse>(`/admin/tags/${id}`)

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

export const reorderTags = (ids: number[]): Promise<OkResponse> =>
  api.patch<OkResponse>('/admin/tags/reorder', { ids })
