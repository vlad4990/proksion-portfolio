// Read-модель публичного API: тонкие чтения, СКОМПОНОВАННЫЕ над репозиториями задачи 02
// (никакого сырого SQL — только композиция repo-методов). Здесь живёт резолв cover-картинки
// для тайла и обход дерева для глобального листинга `/works`.

import type { Image, Work } from './types.ts'
import type { Repos } from './repos.ts'
import { toTile, type Tile } from './dto.ts'

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

/** Работа вместе со слагами её пути — контекст обхода дерева для глобального листинга. */
export interface WorkWithPath {
  work: Work
  catSlug: string
  subSlug: string
}

/**
 * Все работы в глобальном детерминированном порядке: обход дерева
 * category.sort_order → subcategory.sort_order → work.sort_order (каждый уровень
 * уже отсортирован репозиторием). Слаги категории/подкатегории сохраняются
 * из области видимости обхода — они нужны тайлу для канонической ссылки.
 */
export function allWorks(repos: Repos): WorkWithPath[] {
  const works: WorkWithPath[] = []
  for (const category of repos.category.list()) {
    for (const subcategory of repos.subcategory.list(category.id)) {
      for (const work of repos.work.list(subcategory.id)) {
        works.push({ work, catSlug: category.slug, subSlug: subcategory.slug })
      }
    }
  }
  return works
}

/** Тайлы всех работ (глобальный листинг `/works`), работы без картинок опущены. */
export function allTiles(repos: Repos): Tile[] {
  return allWorks(repos)
    .map(({ work, catSlug, subSlug }) => workTile(repos, work, catSlug, subSlug))
    .filter((tile): tile is Tile => tile !== null)
}
