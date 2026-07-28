// Публичные read-эндпоинты (docs/architecture.md §4, §7). Только чтение, без авторизации.
// Роуты объявляются ОТ КОРНЯ — снаружи доступны как /api/... (Caddy `handle_path /api/*`
// срезает префикс, §7). Мутации/аплоад — задачи 04–06, здесь их нет.
//
// Пагинация `/works` — зафиксированный контракт: offset/limit (дефолт limit 24 — порция
// инфинити-скролла, максимум 100). Ответ: { items: Tile[], total, limit, offset };
// `total` учитывает фильтры `category`/`subcategory`/`tag` (спека редизайна §5.4).
//
// Счётчики (`work_count`, `/tags`) и листинги считают только ВИДИМЫЕ работы — с ≥1 картинкой
// (спека редизайна §5.2): ровно то, что реально рендерится тайлами.

import { Elysia } from 'elysia'
import type { Database } from 'bun:sqlite'
import { createRepos, type Repos } from '../repos.ts'
import {
  categoryStats,
  countWorkTiles,
  featuredSections,
  listWorkTiles,
  subcategoryTiles,
  subcategoryWorkCounts,
  tagNavs,
  EMPTY_CATEGORY_STATS,
  type WorksFilter,
} from '../queries.ts'
import {
  toCategoryDetail,
  toCategoryNav,
  toCategoryRef,
  toSubcategoryNav,
  toSubcategoryRef,
  toWorkDetail,
  toWorkDetailById,
  type CategoryDetail,
  type CategoryNav,
  type FeaturedSection,
  type SubcategoryListing,
  type TagNav,
  type WorkDetail,
  type WorkDetailById,
  type WorksPage,
} from '../dto.ts'

export const DEFAULT_WORKS_LIMIT = 24
export const MAX_WORKS_LIMIT = 100

/** limit: положительное целое; невалидное → дефолт 24; больше максимума → клампится к 100. */
function parseLimit(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_WORKS_LIMIT
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1) return DEFAULT_WORKS_LIMIT
  return Math.min(n, MAX_WORKS_LIMIT)
}

/** offset: неотрицательное целое; невалидное → 0. */
function parseOffset(raw: string | undefined): number {
  if (raw === undefined) return 0
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0) return 0
  return n
}

/** id работы: положительное целое; иначе `null` (→ 404). */
function parseId(raw: string): number | null {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

/** Пустой параметр (`?category=`) — это отсутствие фильтра, а не поиск пустого слага. */
function parseFilter(raw: string | undefined): string | undefined {
  return raw === undefined || raw === '' ? undefined : raw
}

/** Подкатегории категории со счётчиками видимых работ (счёт — SQL'ем, один GROUP BY на всё). */
function subcategoryNavs(repos: Repos, categoryId: number, counts: Map<number, number>) {
  return repos.subcategory
    .list(categoryId)
    .map((sub) => toSubcategoryNav(sub, counts.get(sub.id) ?? 0))
}

export function publicRoutes(db: Database) {
  const repos = createRepos(db)

  return new Elysia()
    .get('/health', () => 'ok')

    // Все категории (+ контент секции, агрегаты, подкатегории/счётчики) для навигации.
    .get('/categories', () => {
      const counts = subcategoryWorkCounts(db)
      const stats = categoryStats(db)
      const navs: CategoryNav[] = repos.category
        .list()
        .map((cat) =>
          toCategoryNav(
            cat,
            subcategoryNavs(repos, cat.id, counts),
            stats.get(cat.id) ?? EMPTY_CATEGORY_STATS,
          ),
        )
      return navs
    })

    // Одна категория + её подкатегории (+ description_long для страницы категории).
    .get('/categories/:cat', ({ params, set }) => {
      const category = repos.category.getBySlug(params.cat)
      if (!category) {
        set.status = 404
        return { error: 'not_found', resource: 'category', slug: params.cat }
      }
      const detail: CategoryDetail = toCategoryDetail(
        category,
        subcategoryNavs(repos, category.id, subcategoryWorkCounts(db)),
        categoryStats(db).get(category.id) ?? EMPTY_CATEGORY_STATS,
      )
      return detail
    })

    // Теги-фильтры чипов /projects со счётчиками видимых работ (спека редизайна §5.3).
    .get('/tags', () => {
      const tags: TagNav[] = tagNavs(db)
      return tags
    })

    // Витрины секций корневой /projects: кураторский список либо fallback (§5.3).
    .get('/featured', () => {
      const sections: FeaturedSection[] = featuredSections(db)
      return sections
    })

    // Подкатегория + работы (тайлы { id, slug, title, src, w, h, cat, sub, variants }).
    // Остаётся ради совместимости админки; фронт-листинги переезжают на /works?category=&subcategory=.
    .get('/categories/:cat/:sub', ({ params, set }) => {
      const category = repos.category.getBySlug(params.cat)
      if (!category) {
        set.status = 404
        return { error: 'not_found', resource: 'category', slug: params.cat }
      }
      const subcategory = repos.subcategory.getBySlug(category.id, params.sub)
      if (!subcategory) {
        set.status = 404
        return { error: 'not_found', resource: 'subcategory', slug: params.sub }
      }
      const listing: SubcategoryListing = {
        category: toCategoryRef(category),
        subcategory: toSubcategoryRef(subcategory),
        works: subcategoryTiles(repos, subcategory.id, category.slug, subcategory.slug),
      }
      return listing
    })

    // Листинг работ: фильтры category/subcategory/tag + offset/limit-пагинация (в SQL).
    // Неизвестный слаг фильтра — не 404, а пустая страница (§5.4): фронт сам решает,
    // показывать ли «ничего не найдено».
    .get('/works', ({ query }) => {
      const limit = parseLimit(query.limit)
      const offset = parseOffset(query.offset)
      const filter: WorksFilter = {
        category: parseFilter(query.category),
        subcategory: parseFilter(query.subcategory),
        tag: parseFilter(query.tag),
      }
      const page: WorksPage = {
        items: listWorkTiles(db, filter, limit, offset),
        total: countWorkTiles(db, filter),
        limit,
        offset,
      }
      return page
    })

    // Полная деталь работы ПО ID (вариант B задачи 10): сегмент `:work` в URL модалки — числовой
    // id работы, поэтому деталь грузится по id. Тот же контент, что и by-slug, ПЛЮС слаги cat/sub —
    // метаданные канонического пути работы, сохранённые в ответе (текущий фронт их не читает:
    // ссылку он строит из тайла; слаги остаются, чтобы путь можно было восстановить из одного id).
    // Путь — `/works/by-id/:id`, а НЕ `/works/:id`: роутер (memoirist) запрещает разные имена
    // параметра в одной позиции, а слот 2 под /works уже занят `:cat` (эндпоинт by-slug).
    // Статический сегмент `by-id` снимает конфликт, оставляя эндпоинт в неймспейсе /works.
    .get('/works/by-id/:id', ({ params, set }) => {
      const id = parseId(params.id)
      if (id === null) {
        set.status = 404
        return { error: 'not_found', resource: 'work', id: params.id }
      }
      const work = repos.work.getById(id)
      if (!work) {
        set.status = 404
        return { error: 'not_found', resource: 'work', id }
      }
      const subcategory = repos.subcategory.getById(work.subcategory_id)
      const category = subcategory ? repos.category.getById(subcategory.category_id) : null
      if (!subcategory || !category) {
        set.status = 404
        return { error: 'not_found', resource: 'work', id }
      }
      const detail: WorkDetailById = toWorkDetailById(
        work,
        repos.image.list(work.id),
        repos.tag.listTagIdsByWork(work.id),
        category.slug,
        subcategory.slug,
      )
      return detail
    })

    // Полная работа: описание + все картинки (варианты/форматы/w/h/alt/sort_order/lqip).
    .get('/works/:cat/:sub/:work', ({ params, set }) => {
      const category = repos.category.getBySlug(params.cat)
      if (!category) {
        set.status = 404
        return { error: 'not_found', resource: 'category', slug: params.cat }
      }
      const subcategory = repos.subcategory.getBySlug(category.id, params.sub)
      if (!subcategory) {
        set.status = 404
        return { error: 'not_found', resource: 'subcategory', slug: params.sub }
      }
      const work = repos.work.getBySlug(subcategory.id, params.work)
      if (!work) {
        set.status = 404
        return { error: 'not_found', resource: 'work', slug: params.work }
      }
      const detail: WorkDetail = toWorkDetail(
        work,
        repos.image.list(work.id),
        repos.tag.listTagIdsByWork(work.id),
      )
      return detail
    })
}
