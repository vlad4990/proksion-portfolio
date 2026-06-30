// Публичные read-эндпоинты (docs/architecture.md §4, §7). Только чтение, без авторизации.
// Роуты объявляются ОТ КОРНЯ — снаружи доступны как /api/... (Caddy `handle_path /api/*`
// срезает префикс, §7). Мутации/аплоад — задачи 04–06, здесь их нет.
//
// Пагинация `/works` — зафиксированный контракт: offset/limit (дефолт limit 60, максимум 100).
// Ответ: { items: Tile[], total, limit, offset }.

import { Elysia } from 'elysia'
import type { Database } from 'bun:sqlite'
import { createRepos, type Repos } from '../repos.ts'
import { allTiles, subcategoryTiles } from '../queries.ts'
import {
  toCategoryNav,
  toCategoryRef,
  toSubcategoryNav,
  toSubcategoryRef,
  toWorkDetail,
  type CategoryNav,
  type SubcategoryListing,
  type WorkDetail,
  type WorksPage,
} from '../dto.ts'

export const DEFAULT_WORKS_LIMIT = 60
export const MAX_WORKS_LIMIT = 100

/** limit: положительное целое; невалидное → дефолт 60; больше максимума → клампится к 100. */
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

/** Навигация: все категории с вложенными подкатегориями и счётчиками работ. */
function categoryNav(repos: Repos, categoryId: number): CategoryNav | null {
  const category = repos.category.getById(categoryId)
  if (!category) return null
  const subcategories = repos.subcategory
    .list(category.id)
    .map((sub) => toSubcategoryNav(sub, repos.work.list(sub.id).length))
  return toCategoryNav(category, subcategories)
}

export function publicRoutes(db: Database) {
  const repos = createRepos(db)

  return new Elysia()
    .get('/health', () => 'ok')

    // Все категории (+ подкатегории/счётчики) для навигации.
    .get('/categories', () =>
      repos.category
        .list()
        .map((cat) => categoryNav(repos, cat.id))
        .filter((nav): nav is CategoryNav => nav !== null),
    )

    // Одна категория + её подкатегории.
    .get('/categories/:cat', ({ params, set }) => {
      const category = repos.category.getBySlug(params.cat)
      if (!category) {
        set.status = 404
        return { error: 'not_found', resource: 'category', slug: params.cat }
      }
      return categoryNav(repos, category.id)
    })

    // Подкатегория + работы (тайлы { id, src, w, h }).
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
        works: subcategoryTiles(repos, subcategory.id),
      }
      return listing
    })

    // Все работы (для /projects), offset/limit-пагинация.
    .get('/works', ({ query }) => {
      const limit = parseLimit(query.limit)
      const offset = parseOffset(query.offset)
      const tiles = allTiles(repos)
      const page: WorksPage = {
        items: tiles.slice(offset, offset + limit),
        total: tiles.length,
        limit,
        offset,
      }
      return page
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
      const detail: WorkDetail = toWorkDetail(work, repos.image.list(work.id))
      return detail
    })
}
