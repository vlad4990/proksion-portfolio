// Доменные типы PROKSION (см. docs/architecture.md §3).
// Строки репозиториев типизированы этими интерфейсами — никаких `any`.

export interface Category {
  id: number
  slug: string
  title: string
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Subcategory {
  id: number
  category_id: number
  slug: string
  title: string
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Work {
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

export interface Image {
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

// --- Входные данные для create/update (поля с дефолтами/nullable — опциональны) ---

export interface NewCategory {
  slug: string
  title: string
  description?: string | null
  sort_order?: number
}
export type CategoryPatch = Partial<Pick<Category, 'slug' | 'title' | 'description' | 'sort_order'>>

export interface NewSubcategory {
  category_id: number
  slug: string
  title: string
  description?: string | null
  sort_order?: number
}
export type SubcategoryPatch = Partial<Pick<Subcategory, 'slug' | 'title' | 'description' | 'sort_order'>>

export interface NewWork {
  subcategory_id: number
  slug: string
  title?: string | null
  description?: string | null
  cover_image_id?: number | null
  sort_order?: number
}
export type WorkPatch = Partial<
  Pick<Work, 'slug' | 'title' | 'description' | 'cover_image_id' | 'sort_order'>
>

export interface NewImage {
  work_id: number
  key_base: string
  width: number
  height: number
  alt?: string | null
  lqip?: string | null
  sort_order?: number
}
export type ImagePatch = Partial<
  Pick<Image, 'key_base' | 'width' | 'height' | 'alt' | 'lqip' | 'sort_order'>
>
