// Read-модель публичного API. Два слоя:
//
//  1) КОМПОЗИЦИЯ РЕПОЗИТОРИЕВ (задача 02) — точечные чтения по дереву: резолв cover-картинки
//     работы и тайлы одной подкатегории. Никакого SQL, только repo-методы.
//  2) SQL-ЧТЕНИЯ (задача 14, спека редизайна §5) — агрегаты и листинги, которые нельзя честно
//     и дёшево посчитать в памяти: счётчики видимых работ, теги со счётчиками, витрины
//     категорий и фильтруемый `/works` с LIMIT/OFFSET прямо в базе. Здесь допустим сырой SQL
//     (репозитории намеренно остаются CRUD-слоем и агрегатов не знают).
//
// Инвариант обоих слоёв: «ВИДИМАЯ работа» = у работы есть хотя бы одна картинка. Работа без
// картинок не рендерится тайлом, поэтому не попадает ни в листинги, ни в счётчики (§5.2) —
// «ПОКАЗАНО N ИЗ M» на фронте честный.

import type { Database } from 'bun:sqlite'
import type { Image, Tag, Work } from './types.ts'
import type { Repos } from './repos.ts'
import {
  featuredWorkFromRow,
  tileFromRow,
  toTagNav,
  toTile,
  type CategoryStats,
  type FeaturedRow,
  type FeaturedSection,
  type TagNav,
  type Tile,
  type TileRow,
} from './dto.ts'

// ── Слой 1: композиция репозиториев ───────────────────────────────────────────

/**
 * Cover-картинка работы для тайла: сначала `cover_image_id`, иначе первая картинка работы
 * (по sort_order). `null`, если у работы нет ни одной картинки — такую работу нельзя
 * отрендерить тайлом, и листинг её опускает.
 */
export function resolveCover(repos: Repos, work: Work): Image | null {
  if (work.cover_image_id !== null) {
    const cover = repos.image.getById(work.cover_image_id)
    if (cover) return cover
  }
  return repos.image.list(work.id)[0] ?? null
}

/** Тайл работы, либо `null` если у работы нет картинок (нечем рендерить).
 *  Слаги cat/sub приходят из контекста вызова (обработчик или обход дерева) —
 *  дополнительных запросов на них не нужно. */
export function workTile(repos: Repos, work: Work, catSlug: string, subSlug: string): Tile | null {
  const cover = resolveCover(repos, work)
  return cover ? toTile(work, cover, catSlug, subSlug) : null
}

/** Тайлы всех работ подкатегории, в порядке `sort_order` (репозиторий уже сортирует). */
export function subcategoryTiles(
  repos: Repos,
  subcategoryId: number,
  catSlug: string,
  subSlug: string,
): Tile[] {
  return repos.work
    .list(subcategoryId)
    .map((work) => workTile(repos, work, catSlug, subSlug))
    .filter((tile): tile is Tile => tile !== null)
}

// ── Слой 2: SQL-чтения (агрегаты и листинги) ──────────────────────────────────

/**
 * Cover работы одним выражением — та же логика, что у `resolveCover`: сначала строка,
 * на которую указывает `cover_image_id` (подзапросом, а не по самому id — чтобы висячая
 * ссылка не «съедала» работу), иначе первая своя картинка по `sort_order`.
 */
const COVER_ID = `COALESCE(
      (SELECT ci.id FROM image ci WHERE ci.id = w.cover_image_id),
      (SELECT fi.id FROM image fi WHERE fi.work_id = w.id ORDER BY fi.sort_order, fi.id LIMIT 1)
    )`

/** Критерий видимости работы (см. шапку файла). Используется и листингами, и счётчиками. */
const VISIBLE = 'EXISTS (SELECT 1 FROM image i WHERE i.work_id = w.id)'

/** Колонки тайла — ровно поля `TileRow`. */
const TILE_COLUMNS = `w.id AS id, w.slug AS slug, w.title AS title,
         c.slug AS cat, s.slug AS sub,
         img.key_base AS key_base, img.width AS width, img.height AS height`

/** Работа + путь (категория/подкатегория) + отрезолвленная cover-картинка. */
const TILE_FROM = `FROM work w
    JOIN subcategory s ON s.id = w.subcategory_id
    JOIN category    c ON c.id = s.category_id
    JOIN image     img ON img.id = ${COVER_ID}`

/** То же дерево без cover-джойна — для COUNT'ов (условия фильтра ссылаются на c/s). */
const COUNT_FROM = `FROM work w
    JOIN subcategory s ON s.id = w.subcategory_id
    JOIN category    c ON c.id = s.category_id`

/** Глобальный порядок листинга: категория → подкатегория → работа (id — стабильный tie-break). */
const TILE_ORDER = 'ORDER BY c.sort_order, s.sort_order, w.sort_order, w.id'

/** Фильтры глобального листинга `/works` (спека редизайна §5.4); комбинируются по И. */
export interface WorksFilter {
  category?: string | undefined
  /** Требует `category`: слаг подкатегории уникален только внутри своей категории. */
  subcategory?: string | undefined
  tag?: string | undefined
}

/**
 * WHERE-условия фильтра. `null` — фильтр неразрешим (подкатегория без категории: слаг
 * подкатегории вне категории неоднозначен), вызывающий отдаёт пустую страницу.
 * Неизвестные слаги специально не проверяются: SQL сам не найдёт совпадений → пустая
 * страница с `total: 0`, как требует §5.4 (никаких 404 на фильтрах).
 */
function worksWhere(filter: WorksFilter): { sql: string; params: string[] } | null {
  if (filter.subcategory !== undefined && filter.category === undefined) return null

  const clauses = [VISIBLE]
  const params: string[] = []
  if (filter.category !== undefined) {
    clauses.push('c.slug = ?')
    params.push(filter.category)
  }
  if (filter.subcategory !== undefined) {
    clauses.push('s.slug = ?')
    params.push(filter.subcategory)
  }
  if (filter.tag !== undefined) {
    clauses.push(
      `EXISTS (SELECT 1 FROM work_tag wt JOIN tag t ON t.id = wt.tag_id
                 WHERE wt.work_id = w.id AND t.slug = ?)`,
    )
    params.push(filter.tag)
  }
  return { sql: `WHERE ${clauses.join(' AND ')}`, params }
}

/** Страница тайлов по фильтру: один JOIN-запрос с LIMIT/OFFSET (пагинация — в базе). */
export function listWorkTiles(
  db: Database,
  filter: WorksFilter,
  limit: number,
  offset: number,
): Tile[] {
  const where = worksWhere(filter)
  if (where === null) return []
  const params: (string | number)[] = [...where.params, limit, offset]
  return db
    .query<TileRow, (string | number)[]>(
      `SELECT ${TILE_COLUMNS} ${TILE_FROM} ${where.sql} ${TILE_ORDER} LIMIT ? OFFSET ?`,
    )
    .all(...params)
    .map(tileFromRow)
}

/** Общее число работ под тот же фильтр (`total` страницы). */
export function countWorkTiles(db: Database, filter: WorksFilter): number {
  const where = worksWhere(filter)
  if (where === null) return 0
  const row = db
    .query<{ n: number }, string[]>(`SELECT COUNT(*) AS n ${COUNT_FROM} ${where.sql}`)
    .get(...where.params)
  return row?.n ?? 0
}

/** Счётчики видимых работ по подкатегориям: `subcategory.id → work_count`. */
export function subcategoryWorkCounts(db: Database): Map<number, number> {
  const rows = db
    .query<{ subcategory_id: number; work_count: number }, []>(
      `SELECT w.subcategory_id AS subcategory_id, COUNT(*) AS work_count
         FROM work w WHERE ${VISIBLE} GROUP BY w.subcategory_id`,
    )
    .all()
  return new Map(rows.map((row) => [row.subcategory_id, row.work_count]))
}

/**
 * Агрегаты по видимым работам категорий: `category.id → { work_count, updated_max }`.
 * `updated_max` отдаётся ISO-строкой (`strftime`): в БД timestamp'ы лежат как
 * `YYYY-MM-DD HH:MM:SS` (UTC, `datetime('now')`), а такой формат `new Date(...)` парсит
 * не во всех браузерах — фронту нужен разбираемый «ОБНОВЛЕНО — ИЮЛЬ 2026» (спека §5.2).
 */
export function categoryStats(db: Database): Map<number, CategoryStats> {
  const rows = db
    .query<{ category_id: number; work_count: number; updated_max: string | null }, []>(
      `SELECT s.category_id AS category_id, COUNT(*) AS work_count,
              strftime('%Y-%m-%dT%H:%M:%SZ', MAX(w.updated_at)) AS updated_max
         FROM work w
         JOIN subcategory s ON s.id = w.subcategory_id
        WHERE ${VISIBLE}
        GROUP BY s.category_id`,
    )
    .all()
  return new Map(
    rows.map((row) => [row.category_id, { work_count: row.work_count, updated_max: row.updated_max }]),
  )
}

/** Категория без единой видимой работы — нулевые агрегаты (чтобы не отдавать undefined). */
export const EMPTY_CATEGORY_STATS: CategoryStats = { work_count: 0, updated_max: null }

/** Теги со счётчиками ВИДИМЫХ работ, порядок `sort_order, id`; тег без работ → `work_count: 0`. */
export function tagNavs(db: Database): TagNav[] {
  return db
    .query<Tag & { work_count: number }, []>(
      `SELECT t.*,
              (SELECT COUNT(*) FROM work_tag wt
                 JOIN work w ON w.id = wt.work_id
                WHERE wt.tag_id = t.id AND ${VISIBLE}) AS work_count
         FROM tag t
        ORDER BY t.sort_order, t.id`,
    )
    .all()
    .map((row) => toTagNav(row, row.work_count))
}

/** Сколько работ показывает витрина категории, у которой кураторский список пуст (§5.3). */
export const FEATURED_FALLBACK_LIMIT = 8

/** Кураторская витрина категории: работы с `featured_order`, по возрастанию порядка. */
function curatedRows(db: Database, categoryId: number): FeaturedRow[] {
  return db
    .query<FeaturedRow, [number]>(
      `SELECT ${TILE_COLUMNS}, w.description AS description
         ${TILE_FROM}
        WHERE ${VISIBLE} AND c.id = ? AND w.featured_order IS NOT NULL
        ORDER BY w.featured_order, w.id`,
    )
    .all(categoryId)
}

/** Fallback-витрина: первые видимые работы категории (подкатегория → работа по sort_order). */
function fallbackRows(db: Database, categoryId: number, limit: number): FeaturedRow[] {
  return db
    .query<FeaturedRow, [number, number]>(
      `SELECT ${TILE_COLUMNS}, w.description AS description
         ${TILE_FROM}
        WHERE ${VISIBLE} AND c.id = ?
        ORDER BY s.sort_order, w.sort_order, w.id
        LIMIT ?`,
    )
    .all(categoryId, limit)
}

/**
 * Витрины всех категорий в порядке `sort_order` (спека редизайна §5.3).
 * Кураторский список (`work.featured_order`) → `curated: true`; если он пуст —
 * первые `FEATURED_FALLBACK_LIMIT` видимых работ и `curated: false` (страница не должна
 * быть пустой до кураторства). Категория без видимых работ → `works: []`.
 * Работа без картинок в витрину не попадает: тайл из неё не собрать.
 */
export function featuredSections(db: Database): FeaturedSection[] {
  const categories = db
    .query<{ id: number; slug: string }, []>(
      'SELECT id, slug FROM category ORDER BY sort_order, id',
    )
    .all()

  return categories.map((category) => {
    const curated = curatedRows(db, category.id)
    const rows =
      curated.length > 0 ? curated : fallbackRows(db, category.id, FEATURED_FALLBACK_LIMIT)
    return {
      cat: category.slug,
      curated: curated.length > 0,
      works: rows.map(featuredWorkFromRow),
    }
  })
}
