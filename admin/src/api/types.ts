// Типы контрактов бэкенда (docs/architecture.md §3, §7). Зеркалят back/src/dto.ts (READ-формы
// публичного API задачи 03) и back/src/types.ts (raw-строки, которые admin-CRUD задачи 06
// возвращает на create/update). Источник правды — код бэка; здесь только TS-проекция, без `any`.

// ── Raw-строки (ответы admin-CRUD, back/src/types.ts) ────────────────────────────────

export interface CategoryRow {
  id: number
  slug: string
  title: string
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface SubcategoryRow {
  id: number
  category_id: number
  slug: string
  title: string
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface WorkRow {
  id: number
  subcategory_id: number
  slug: string
  title: string | null
  description: string | null
  cover_image_id: number | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ImageRow {
  id: number
  work_id: number
  key_base: string
  width: number
  height: number
  alt: string | null
  lqip: string | null
  sort_order: number
  created_at: string
}

// ── READ-формы публичного API (back/src/dto.ts, задача 03) ────────────────────────────

export interface CategoryRef {
  id: number
  slug: string
  title: string
  description: string | null
  sort_order: number
}

export interface SubcategoryRef {
  id: number
  slug: string
  title: string
  description: string | null
  sort_order: number
}

export interface SubcategoryNav extends SubcategoryRef {
  work_count: number
}

export interface CategoryNav extends CategoryRef {
  subcategories: SubcategoryNav[]
}

/** Тайл листинга: id РАБОТЫ + URL thumb cover + натуральные размеры. БЕЗ slug/title (см. §7). */
export interface Tile {
  id: number
  src: string
  w: number
  h: number
}

export interface SubcategoryListing {
  category: CategoryRef
  subcategory: SubcategoryRef
  works: Tile[]
}

export type ImageFormat = 'avif' | 'webp' | 'jpg'
export type ImageVariant = 'thumb' | 'full'
export type VariantUrls = Record<ImageFormat, string>
export type ImageVariants = Record<ImageVariant, VariantUrls>

export interface ImageDetail {
  id: number
  w: number
  h: number
  alt: string | null
  sort_order: number
  lqip?: string
  variants: ImageVariants
}

export interface WorkDetail {
  id: number
  slug: string
  title: string | null
  description: string | null
  cover_image_id: number | null
  images: ImageDetail[]
}

/** Ответ всех admin DELETE/reorder. */
export interface OkResponse {
  ok: true
}
