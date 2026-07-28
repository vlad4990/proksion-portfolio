// Построение списка работ для admin-экрана подкатегории. Тайл публичного листинга с задачи 14
// самодостаточен (`slug`/`title` в контракте, спека редизайна §5.1) — слаг видимой работы больше
// не зависит от сессии, «Управление» доступно и после F5. Реестр известных работ остаётся
// источником для работ БЕЗ картинок (их в листинге нет вовсе) и запасным именем для тайла.
// Чистая функция → покрыта тестами.

import type { Tile } from '@/api/types'
import type { KnownWork } from '@/content/work-registry'

export interface WorkViewRow {
  id: number
  /** Слаг из тайла (видимые работы) или из реестра (работы без картинок); иначе null. */
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

  // 1) Тайлы (работы с картинками) в их серверном порядке. Данные тайла — источник правды;
  // реестр подставляет только то, чего в нём нет (например, название, снятое до рефетча).
  const rows: WorkViewRow[] = tiles.map((tile) => {
    const meta = knownById.get(tile.id)
    return {
      id: tile.id,
      slug: tile.slug || meta?.slug || null,
      title: tile.title ?? meta?.title ?? null,
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
