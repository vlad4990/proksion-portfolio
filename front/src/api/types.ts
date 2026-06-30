// Типы ответов публичного API (docs/architecture.md §7; контракты задачи 03 —
// back/src/dto.ts). Совместимы с masonry-листингом фронта (front/CLAUDE.md): тайл — { id, src, w, h }.
// Зеркалят back/src/dto.ts; форма СТАБИЛЬНА — менять синхронно с бэкендом.

/**
 * Тайл листинга. `id` — id работы (задел под клик → модалка, задача 10);
 * `src` — URL thumb cover-картинки (`/media/...`); `w/h` — натуральные размеры
 * (фронт ставит aspect-ratio → нет скачков layout).
 */
export interface Tile {
  id: number
  src: string
  w: number
  h: number
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
