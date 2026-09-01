// Типы ответов публичного API (docs/architecture.md §7; контракты задачи 03 —
// back/src/dto.ts, расширение редизайна — docs/projects-redesign.md §5, задача 14).
// Совместимы с masonry-листингом фронта (front/CLAUDE.md): тайл —
// { id, slug, title, src, w, h, cat, sub, variants }. Зеркалят back/src/dto.ts;
// форма СТАБИЛЬНА — менять синхронно с бэкендом.

/**
 * Тайл листинга. `id` — id работы; `slug`/`title` — слаг работы для канонического URL модалки
 * `/projects/:cat/:sub/:slug` и заголовок (aria-label, подпись hero-тайла витрины);
 * `src` — URL thumb cover-картинки (`/media/...`, jpg-fallback); `w/h` — натуральные размеры
 * (фронт ставит aspect-ratio → нет скачков layout); `cat`/`sub` — слаги пути: тайл сразу знает
 * свой канонический URL и рендерится настоящей ссылкой (в т.ч. с глобального листинга);
 * `variants` — thumb в avif/webp/jpg для `<picture>` (avif втрое легче jpg).
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

/** Вариант вёрстки секции-витрины категории на `/projects` (спека редизайна §2.1). */
export type DisplayVariant = 'showcase' | 'strip' | 'cards'

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

/**
 * Подкатегория для навигации: метаданные + счётчик работ.
 * `work_count` — только ВИДИМЫЕ работы (с картинками), т.е. ровно те, что рендерятся
 * тайлами (спека редизайна §5.2 — счётчик «ПОКАЗАНО N ИЗ M» честный).
 */
export interface SubcategoryNav extends SubcategoryRef {
  work_count: number
}

/**
 * Категория для навигации: метаданные + контент секции редизайна + агрегаты по видимым
 * работам + вложенные подкатегории. `updated_max` — max `work.updated_at` ISO-строкой
 * (`2026-07-28T01:15:09Z`, разбирается `new Date`) либо `null`, если видимых работ нет
 * (крошки страницы категории: «ОБНОВЛЕНО — ИЮЛЬ 2026»).
 */
export interface CategoryNav extends CategoryRef {
  kicker: string | null
  meta_role: string | null
  period: string | null
  display_variant: DisplayVariant
  work_count: number
  updated_max: string | null
  subcategories: SubcategoryNav[]
}

/** Ответ `GET /api/categories/:cat`: навигационная форма + длинное описание страницы. */
export interface CategoryDetail extends CategoryNav {
  description_long: string | null
}

/** Тег-фильтр чипов `/projects` со счётчиком видимых работ (`GET /api/tags`, §5.3). */
export interface TagNav {
  id: number
  slug: string
  title: string
  sort_order: number
  work_count: number
}

/** Работа кураторской витрины: тайл + описание (карточки варианта `cards`). */
export interface FeaturedWork extends Tile {
  description: string | null
}

/**
 * Секция витрины категории на корневой `/projects` (`GET /api/featured`, §5.3).
 * `curated: false` — витрина не настроена, показан fallback (первые видимые работы).
 */
export interface FeaturedSection {
  cat: string
  curated: boolean
  works: FeaturedWork[]
}

/** Ответ листинга подкатегории: контекст + тайлы работ. */
export interface SubcategoryListing {
  category: CategoryRef
  subcategory: SubcategoryRef
  works: Tile[]
}

/**
 * Страница листинга `/works` (offset/limit-пагинация; дефолт limit 24, максимум 100).
 * Фильтры-квери `category`/`subcategory`(требует category)/`tag` комбинируются,
 * `total` их учитывает; неизвестный слаг → пустая страница, не ошибка (§5.4).
 */
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

/**
 * Полная работа: описание + упорядоченные картинки ленты + `seamless` (лента без зазоров) +
 * `carousel` (десктоп: горизонтальная псевдо-карусель вместо вертикальной ленты; мобилка
 * и работы с одной картинкой флаг игнорируют) +
 * `tag_ids` (id тегов работы; нужны админке для мультивыбора, фронту не мешают).
 */
export interface WorkDetail {
  id: number
  slug: string
  title: string | null
  description: string | null
  cover_image_id: number | null
  /**
   * «Единое полотно» (флаг работы в админке): лента картинок в модалке идёт стык-в-стык,
   * без зазора — для работ, нарезанных из одного макета.
   */
  seamless: boolean
  carousel: boolean
  tag_ids: number[]
  images: ImageDetail[]
}

/**
 * Деталь работы по id (эндпоинт `/api/works/by-id/:id`, задача 10, вариант B). Всё из
 * `WorkDetail` + слаги пути `cat`/`sub`: сегмент `:work` в URL модалки — числовой id работы,
 * поэтому деталь грузится по id. `cat`/`sub` — метаданные канонического пути
 * `/projects/:cat/:sub/:id`, сохранённые в контракте: текущий фронт их не читает (ссылку строит
 * из тайла), они остаются в ответе, чтобы путь можно было восстановить из одного id.
 */
export interface WorkDetailById extends WorkDetail {
  cat: string
  sub: string
}
