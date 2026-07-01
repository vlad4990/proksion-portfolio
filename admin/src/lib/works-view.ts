// Построение списка работ для admin-экрана подкатегории. Обходит контракт-гэп задачи 03:
// публичный листинг (тайлы) включает ТОЛЬКО работы с картинками и не отдаёт slug/title.
// Поэтому объединяем тайлы (упорядочены по sort_order, есть cover, id) с реестром известных
// работ сессии (есть slug/title, в т.ч. ещё без картинок). Чистая функция → покрыта тестами.

import type { Tile } from '@/api/types'
import type { KnownWork } from '@/content/work-registry'

export interface WorkViewRow {
  id: number
  /** slug известен только для работ из реестра — иначе null (edit/картинки недоступны). */
  slug: string | null
  title: string | null
  /** URL cover-thumb (для работ с картинками) или null. */
  cover: string | null
  w: number | null
  h: number | null
}

export function buildWorksView(
  tiles: readonly Tile[],
  known: readonly KnownWork[],
): WorkViewRow[] {
  const knownById = new Map(known.map((k) => [k.id, k]))

  // 1) Тайлы (работы с картинками) в их серверном порядке.
  const rows: WorkViewRow[] = tiles.map((tile) => {
    const meta = knownById.get(tile.id)
    return {
      id: tile.id,
      slug: meta?.slug ?? null,
      title: meta?.title ?? null,
      cover: tile.src,
      w: tile.w,
      h: tile.h,
    }
  })

  // 2) Известные работы без картинок (ещё не в листинге) — в хвост.
  const tileIds = new Set(tiles.map((t) => t.id))
  for (const meta of known) {
    if (!tileIds.has(meta.id)) {
      rows.push({ id: meta.id, slug: meta.slug, title: meta.title, cover: null, w: null, h: null })
    }
  }

  return rows
}
