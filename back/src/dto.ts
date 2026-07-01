// Сериализаторы публичного API (docs/architecture.md §7) — чистые функции «доменная строка
// → форма ответа». Контракты ниже СТАБИЛЬНЫ: на них завязан фронт (задачи 09–10), менять
// их потом дорого. Любая правка формы — осознанно и синхронно с фронтом.

import type { Category, Image, Subcategory, Work } from './types.ts'
import { imageVariants, mediaUrl, type ImageVariants } from './media-url.ts'

// ── Контракты ответов ─────────────────────────────────────────────────────────

/**
 * Тайл листинга (совместим с masonry-фронтом, см. front/CLAUDE.md).
 * `id` — id РАБОТЫ (клик → модалка работы); `src` — URL thumb cover-картинки
 * (jpg как универсальный fallback, §5); `w/h` — натуральные размеры (фронт ставит aspect-ratio).
 */
export interface Tile {
  id: number
  src: string
  w: number
  h: number
}

/** Картинка в детали работы: все варианты/форматы + метаданные. `lqip` — только если задан. */
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
 * Деталь работы, адресуемой по id (задача 10, вариант B). Всё из `WorkDetail` + слаги пути
 * `cat`/`sub`: клик из ГЛОБАЛЬНОГО листинга `/projects` знает только id тайла, поэтому
 * фронт резолвит канонический URL `/projects/:cat/:sub/:id` из этого ответа.
 */
export interface WorkDetailById extends WorkDetail {
  cat: string
  sub: string
}

/** Плоская метаинформация категории (без вложенных детей). */
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

/** Категория для навигации: метаданные + вложенные подкатегории со счётчиками. */
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

// ── Сериализаторы ──────────────────────────────────────────────────────────────

export function toTile(work: Work, cover: Image): Tile {
  return { id: work.id, src: mediaUrl(cover.key_base, 'thumb', 'jpg'), w: cover.width, h: cover.height }
}

export function toImageDetail(image: Image): ImageDetail {
  const detail: ImageDetail = {
    id: image.id,
    w: image.width,
    h: image.height,
    alt: image.alt,
    sort_order: image.sort_order,
    variants: imageVariants(image.key_base),
  }
  if (image.lqip !== null) detail.lqip = image.lqip
  return detail
}

export function toWorkDetail(work: Work, images: Image[]): WorkDetail {
  return {
    id: work.id,
    slug: work.slug,
    title: work.title,
    description: work.description,
    cover_image_id: work.cover_image_id,
    images: images.map(toImageDetail),
  }
}

/** Как `toWorkDetail`, но с добавленными слагами пути (`cat`/`sub`) для адресации по id. */
export function toWorkDetailById(
  work: Work,
  images: Image[],
  catSlug: string,
  subSlug: string,
): WorkDetailById {
  return { ...toWorkDetail(work, images), cat: catSlug, sub: subSlug }
}

export function toCategoryRef(category: Category): CategoryRef {
  return {
    id: category.id,
    slug: category.slug,
    title: category.title,
    description: category.description,
    sort_order: category.sort_order,
  }
}

export function toSubcategoryRef(subcategory: Subcategory): SubcategoryRef {
  return {
    id: subcategory.id,
    slug: subcategory.slug,
    title: subcategory.title,
    description: subcategory.description,
    sort_order: subcategory.sort_order,
  }
}

export function toSubcategoryNav(subcategory: Subcategory, workCount: number): SubcategoryNav {
  return { ...toSubcategoryRef(subcategory), work_count: workCount }
}

export function toCategoryNav(category: Category, subcategories: SubcategoryNav[]): CategoryNav {
  return { ...toCategoryRef(category), subcategories }
}
