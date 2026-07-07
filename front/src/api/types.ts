// Типы ответов публичного API (docs/architecture.md §7; контракты задачи 03 —
// back/src/dto.ts). Совместимы с masonry-листингом фронта (front/CLAUDE.md):
// тайл — { id, src, w, h, cat, sub }. Зеркалят back/src/dto.ts; форма СТАБИЛЬНА —
// менять синхронно с бэкендом.

/**
 * Тайл листинга. `id` — id работы; `src` — URL thumb cover-картинки (`/media/...`,
 * jpg-fallback); `w/h` — натуральные размеры (фронт ставит aspect-ratio → нет скачков
 * layout); `cat`/`sub` — слаги пути: тайл сразу знает свой канонический URL
 * `/projects/:cat/:sub/:id` и рендерится настоящей ссылкой (в т.ч. с глобального листинга);
 * `variants` — thumb в avif/webp/jpg для `<picture>` (avif втрое легче jpg).
 */
export interface Tile {
  id: number
  src: string
  w: number
  h: number
  cat: string
  sub: string
  variants: VariantUrls
}

/** Плоская метаинформация категории. */
export interface CategoryRef {
  id: number
  slug: string
  title: string
  description: string | null
  sort_order: number
}

/** Плоская метаинформация подкатегории. */
export interface SubcategoryRef {
  id: number
  slug: string
  title: string
  description: string | null
  sort_order: number
}

/** Подкатегория для навигации: метаданные + счётчик работ. */
export interface SubcategoryNav extends SubcategoryRef {
  work_count: number
}

/** Категория для навигации: метаданные + вложенные подкатегории. */
export interface CategoryNav extends CategoryRef {
  subcategories: SubcategoryNav[]
}

/** Ответ листинга подкатегории: контекст + тайлы работ. */
export interface SubcategoryListing {
  category: CategoryRef
  subcategory: SubcategoryRef
  works: Tile[]
}

/** Страница глобального листинга `/works` (offset/limit-пагинация). */
export interface WorksPage {
  items: Tile[]
  total: number
  limit: number
  offset: number
}

// ── Деталь работы (модалка, задача 10) ────────────────────────────────────────
// Зеркалят back/src/dto.ts + back/src/media-url.ts. Форма СТАБИЛЬНА — менять синхронно
// с бэкендом. Эндпоинт: GET /api/works/:cat/:sub/:work.

/** Форматы вариантов картинки — AVIF/WebP + JPEG-fallback для `<picture>` (спека §5). */
export type ImageFormat = 'avif' | 'webp' | 'jpg'
/** Размерные варианты: `thumb` — листинг, `full` — модалка. */
export type ImageVariant = 'thumb' | 'full'
/** URL'ы одного размерного варианта во всех форматах. */
export type VariantUrls = Record<ImageFormat, string>
/** Полный блок вариантов картинки: thumb/full × avif/webp/jpg. */
export type ImageVariants = Record<ImageVariant, VariantUrls>

/**
 * Картинка карусели: все варианты/форматы + метаданные. `w/h` — натуральные размеры
 * (фронт ставит aspect-ratio → нет скачков layout). `lqip` — крошечный base64-плейсхолдер,
 * приходит только если задан. `id` — для пиннинга слайда через `?img=<imageId>`.
 */
export interface ImageDetail {
  id: number
  w: number
  h: number
  alt: string | null
  sort_order: number
  lqip?: string
  variants: ImageVariants
}

/** Полная работа: описание + упорядоченные картинки карусели. */
export interface WorkDetail {
  id: number
  slug: string
  title: string | null
  description: string | null
  cover_image_id: number | null
  images: ImageDetail[]
}

/**
 * Деталь работы по id (эндпоинт `/api/works/by-id/:id`, задача 10, вариант B). Всё из
 * `WorkDetail` + слаги пути `cat`/`sub`: по клику из глобального листинга `/projects` у тайла
 * есть только id, и из этого ответа строится канонический URL `/projects/:cat/:sub/:id`.
 */
export interface WorkDetailById extends WorkDetail {
  cat: string
  sub: string
}
