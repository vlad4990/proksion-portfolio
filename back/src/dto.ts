// Сериализаторы публичного API (docs/architecture.md §7) — чистые функции «доменная строка
// → форма ответа». Контракты ниже СТАБИЛЬНЫ: на них завязан фронт (задачи 09–10), менять
// их потом дорого. Любая правка формы — осознанно и синхронно с фронтом.

import type { Category, DisplayVariant, Image, Subcategory, Tag, Work } from './types.ts'
import { imageVariants, mediaUrl, type ImageVariants, type VariantUrls } from './media-url.ts'

// ── Контракты ответов ─────────────────────────────────────────────────────────

/**
 * Тайл листинга (совместим с masonry-фронтом, см. front/CLAUDE.md).
 * `id` — id РАБОТЫ (клик → модалка работы); `slug`/`title` — слаг работы для канонического
 * URL модалки `/projects/:cat/:sub/:slug` и заголовок (aria-label, подпись hero-тайла витрины,
 * списки админки — спека редизайна §5.1); `src` — URL thumb cover-картинки
 * (jpg как универсальный fallback, §5); `w/h` — натуральные размеры (фронт ставит aspect-ratio);
 * `cat`/`sub` — слаги пути: тайл ЛЮБОГО листинга (включая глобальный `/works`) сразу знает
 * свой канонический URL, и фронт рендерит настоящую ссылку;
 * `variants` — thumb во всех форматах (avif/webp/jpg) для `<picture>` в листинге
 * (avif втрое легче jpg; `src` остаётся jpg-fallback для потребителей без `<picture>`).
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

/**
 * Плоская строка-источник тайла для SQL-листингов (`queries.ts`): работа + слаги её пути +
 * поля уже отрезолвленной cover-картинки. Repo-листинги собирают тайл из доменных строк
 * (`toTile`), SQL-листинги — из этой строки (`tileFromRow`); форма результата одна и та же.
 */
export interface TileRow {
  id: number
  slug: string
  title: string | null
  cat: string
  sub: string
  key_base: string
  width: number
  height: number
}

/** Работа кураторской витрины (`/featured`): тайл + описание для карточек варианта `cards`. */
export interface FeaturedWork extends Tile {
  description: string | null
}

/** Строка-источник работы витрины: `TileRow` + описание. */
export interface FeaturedRow extends TileRow {
  description: string | null
}

/**
 * Секция витрины категории на корневой `/projects` (спека редизайна §5.3).
 * `curated: true` — витрина настроена в админке (`work.featured_order`);
 * `curated: false` — fallback (первые видимые работы категории) либо пустая категория.
 */
export interface FeaturedSection {
  cat: string
  curated: boolean
  works: FeaturedWork[]
}

/** Тег-фильтр чипов `/projects` со счётчиком ВИДИМЫХ работ (спека редизайна §5.3). */
export interface TagNav {
  id: number
  slug: string
  title: string
  sort_order: number
  work_count: number
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

/**
 * Полная работа: описание + упорядоченные картинки карусели + id тегов
 * (`tag_ids` — мультивыбор тегов в админке, спека редизайна §5.5; фронту не мешает).
 */
export interface WorkDetail {
  id: number
  slug: string
  title: string | null
  description: string | null
  cover_image_id: number | null
  tag_ids: number[]
  images: ImageDetail[]
}

/**
 * Деталь работы, адресуемой по id (задача 10, вариант B). Всё из `WorkDetail` + слаги пути
 * `cat`/`sub`: сегмент `:work` в URL модалки — числовой id работы, поэтому деталь грузится по id.
 * `cat`/`sub` — метаданные канонического пути работы (`/projects/:cat/:sub/:id`), сохранённые в
 * контракте ответа. Текущий фронт их не читает (ссылку он строит из тайла ещё до загрузки детали);
 * слаги остаются в ответе, чтобы путь можно было восстановить из одного id.
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

/**
 * Подкатегория для навигации: метаданные + счётчик работ.
 * `work_count` — только ВИДИМЫЕ работы (с ≥1 картинкой), т.е. ровно те, что рендерятся
 * тайлами (спека редизайна §5.2: счётчик «ПОКАЗАНО N ИЗ M» должен быть честным).
 */
export interface SubcategoryNav extends SubcategoryRef {
  work_count: number
}

/** Агрегаты категории по её ВИДИМЫМ работам (считаются SQL'ем, см. `queries.ts`). */
export interface CategoryStats {
  /** Число видимых работ категории = сумма по её подкатегориям. */
  work_count: number
  /** max(`work.updated_at`) по видимым работам; `null` — видимых работ нет. */
  updated_max: string | null
}

/**
 * Категория для навигации: метаданные + контент секции редизайна (§5.2) + агрегаты +
 * вложенные подкатегории со счётчиками. `description_long` здесь НЕТ — он только
 * в детали категории (`CategoryDetail`).
 */
export interface CategoryNav extends CategoryRef, CategoryStats {
  kicker: string | null
  meta_role: string | null
  period: string | null
  display_variant: DisplayVariant
  subcategories: SubcategoryNav[]
}

/** Ответ `GET /categories/:cat`: всё из `CategoryNav` + длинное описание страницы категории. */
export interface CategoryDetail extends CategoryNav {
  description_long: string | null
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

/** Тайл из плоской строки SQL-листинга (порядок ключей — как в `toTile`). */
export function tileFromRow(row: TileRow): Tile {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    src: mediaUrl(row.key_base, 'thumb', 'jpg'),
    w: row.width,
    h: row.height,
    cat: row.cat,
    sub: row.sub,
    variants: imageVariants(row.key_base).thumb,
  }
}

/** Работа витрины: тайл + описание (для карточек варианта `cards`). */
export function featuredWorkFromRow(row: FeaturedRow): FeaturedWork {
  return { ...tileFromRow(row), description: row.description }
}

export function toTile(work: Work, cover: Image, catSlug: string, subSlug: string): Tile {
  return tileFromRow({
    id: work.id,
    slug: work.slug,
    title: work.title,
    cat: catSlug,
    sub: subSlug,
    key_base: cover.key_base,
    width: cover.width,
    height: cover.height,
  })
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

export function toWorkDetail(work: Work, images: Image[], tagIds: number[]): WorkDetail {
  return {
    id: work.id,
    slug: work.slug,
    title: work.title,
    description: work.description,
    cover_image_id: work.cover_image_id,
    tag_ids: tagIds,
    images: images.map(toImageDetail),
  }
}

/** Как `toWorkDetail`, но с добавленными слагами пути (`cat`/`sub`) для адресации по id. */
export function toWorkDetailById(
  work: Work,
  images: Image[],
  tagIds: number[],
  catSlug: string,
  subSlug: string,
): WorkDetailById {
  return { ...toWorkDetail(work, images, tagIds), cat: catSlug, sub: subSlug }
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

export function toCategoryNav(
  category: Category,
  subcategories: SubcategoryNav[],
  stats: CategoryStats,
): CategoryNav {
  return {
    ...toCategoryRef(category),
    kicker: category.kicker,
    meta_role: category.meta_role,
    period: category.period,
    display_variant: category.display_variant,
    work_count: stats.work_count,
    updated_max: stats.updated_max,
    subcategories,
  }
}

/** Деталь категории: навигационная форма + длинное описание страницы категории. */
export function toCategoryDetail(
  category: Category,
  subcategories: SubcategoryNav[],
  stats: CategoryStats,
): CategoryDetail {
  return {
    ...toCategoryNav(category, subcategories, stats),
    description_long: category.description_long,
  }
}

export function toTagNav(tag: Tag, workCount: number): TagNav {
  return {
    id: tag.id,
    slug: tag.slug,
    title: tag.title,
    sort_order: tag.sort_order,
    work_count: workCount,
  }
}
