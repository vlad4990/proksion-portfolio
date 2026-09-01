// Доменные типы PROKSION (см. docs/architecture.md §3).
// Строки репозиториев типизированы этими интерфейсами — никаких `any`.

/** Вариант секции-витрины категории на `/projects` (docs/projects-redesign.md §2.1). */
export type DisplayVariant = 'showcase' | 'strip' | 'cards'

export interface Category {
  id: number
  slug: string
  title: string
  description: string | null
  sort_order: number
  // Контент секции/страницы категории (миграция 0002, спека редизайна §4)
  kicker: string | null
  meta_role: string | null
  period: string | null
  description_long: string | null
  display_variant: DisplayVariant
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
  /** Позиция в кураторской витрине категории (0 = hero); `null` — работа вне витрины. */
  featured_order: number | null
  /**
   * «Единое полотно»: лента картинок в модалке идёт стык-в-стык, без зазора между ними
   * (миграция 0003). SQLite не имеет boolean — хранится как 0|1, наружу (публичный DTO)
   * отдаётся уже как `boolean`.
   */
  seamless: number
  created_at: string
  updated_at: string
}

/** Глобальный тег-фильтр (m2m с работами через `work_tag`). */
export interface Tag {
  id: number
  slug: string
  title: string
  sort_order: number
  created_at: string
  updated_at: string
}

/** Строка связи работа↔тег. Порядок тегов у работы не значим. */
export interface WorkTag {
  work_id: number
  tag_id: number
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
export type CategoryPatch = Partial<
  Pick<
    Category,
    | 'slug'
    | 'title'
    | 'description'
    | 'sort_order'
    | 'kicker'
    | 'meta_role'
    | 'period'
    | 'description_long'
    | 'display_variant'
  >
>

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
  /** 0|1; по умолчанию 0 — лента картинок с зазором. */
  seamless?: number
}
/** `featured_order` сюда НЕ входит: витрина меняется только через `workRepo.setFeatured`. */
export type WorkPatch = Partial<
  Pick<Work, 'slug' | 'title' | 'description' | 'cover_image_id' | 'sort_order' | 'seamless'>
>

export interface NewTag {
  slug: string
  title: string
  sort_order?: number
}
export type TagPatch = Partial<Pick<Tag, 'slug' | 'title' | 'sort_order'>>

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
