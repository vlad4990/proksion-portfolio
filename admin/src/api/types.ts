// Типы контрактов бэкенда (docs/architecture.md §3, §7). Зеркалят back/src/dto.ts (READ-формы
// публичного API задачи 03) и back/src/types.ts (raw-строки, которые admin-CRUD задачи 06
// возвращает на create/update). Источник правды — код бэка; здесь только TS-проекция, без `any`.

// ── Raw-строки (ответы admin-CRUD, back/src/types.ts) ────────────────────────────────

/** Вариант вёрстки секции-витрины категории на `/projects` (спека редизайна §2.1). */
export type DisplayVariant = 'showcase' | 'strip' | 'cards'

export interface CategoryRow {
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
  /** Позиция в кураторской витрине категории (0 = hero); `null` — работа вне витрины. */
  featured_order: number | null
  /** «Единое полотно»: лента картинок в модалке без зазоров. Сырая строка БД → 0|1. */
  seamless: number
  /** «Карусель»: десктопная модалка — горизонтальная карусель вместо ленты. Сырая строка БД → 0|1. */
  carousel: number
  created_at: string
  updated_at: string
}

/** Строка тега (ответы admin-CRUD тегов, задача 15). */
export interface TagRow {
  id: number
  slug: string
  title: string
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

/** `work_count` — только ВИДИМЫЕ работы (с картинками), т.е. те, что есть в листинге (§5.2). */
export interface SubcategoryNav extends SubcategoryRef {
  work_count: number
}

/** Категория навигации: + контент секции редизайна и агрегаты по видимым работам (§5.2). */
export interface CategoryNav extends CategoryRef {
  kicker: string | null
  meta_role: string | null
  period: string | null
  display_variant: DisplayVariant
  work_count: number
  /** max `work.updated_at` по видимым работам ISO-строкой (`2026-07-28T01:15:09Z`) либо `null`. */
  updated_max: string | null
  subcategories: SubcategoryNav[]
}

/** Ответ `GET /api/categories/:cat`: навигационная форма + длинное описание страницы. */
export interface CategoryDetail extends CategoryNav {
  description_long: string | null
}

/** Тег со счётчиком видимых работ (`GET /api/tags` — источник списка тегов и для админки). */
export interface TagNav {
  id: number
  slug: string
  title: string
  sort_order: number
  work_count: number
}

/**
 * Тайл листинга: id РАБОТЫ + слаг/заголовок + URL thumb cover + натуральные размеры + слаги
 * пути (спека редизайна §5.1 — тайл самодостаточен для ссылки и списков админки).
 */
export interface Tile {
  id: number
  slug: string
  title: string | null
  src: string
  w: number
  h: number
  cat: string
  sub: string
  variants: VariantUrls
}

/** Работа кураторской витрины: тайл + описание. */
export interface FeaturedWork extends Tile {
  description: string | null
}

/** Секция витрины категории (`GET /api/featured`); `curated: false` — показан fallback. */
export interface FeaturedSection {
  cat: string
  curated: boolean
  works: FeaturedWork[]
}

export interface SubcategoryListing {
  category: CategoryRef
  subcategory: SubcategoryRef
  works: Tile[]
}

/** Страница листинга `GET /api/works?...` (offset/limit-пагинация, `total` — с учётом фильтров). */
export interface WorksPage {
  items: Tile[]
  total: number
  limit: number
  offset: number
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

/** `tag_ids` — теги работы (мультивыбор в редакторе работы, спека редизайна §5.5). */
export interface WorkDetail {
  id: number
  slug: string
  title: string | null
  description: string | null
  cover_image_id: number | null
  /** «Единое полотно»: лента картинок в модалке идёт стык-в-стык (публичный контракт — boolean). */
  seamless: boolean
  /** «Карусель»: десктопная модалка — горизонтальная карусель вместо ленты (boolean). */
  carousel: boolean
  tag_ids: number[]
  images: ImageDetail[]
}

/** Ответ всех admin DELETE/reorder. */
export interface OkResponse {
  ok: true
}
