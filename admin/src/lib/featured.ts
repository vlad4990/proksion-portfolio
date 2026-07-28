// Чистая логика блока «Витрина раздела» (спека редизайна §7.4). Источник состояния витрины —
// публичный `GET /featured`: у секции есть флаг `curated`. При `curated: false` бэк отдаёт
// FALLBACK (первые видимые работы категории) — для админки это «витрина не настроена», поэтому
// такой список НЕ показываем как выбранный, иначе редактор решит, что работы уже расставлены.
//
// Порядок массива id = порядок витрины (0 = hero); сохраняется одним PATCH `…/featured`.

import type { FeaturedSection, FeaturedWork, Tile } from '@/api/types'

export function sectionForCategory(
  sections: readonly FeaturedSection[],
  catSlug: string,
): FeaturedSection | null {
  return sections.find((s) => s.cat === catSlug) ?? null
}

/** Работы настроенной витрины; fallback (`curated: false`) и отсутствие секции → пусто. */
export function curatedWorks(section: FeaturedSection | null): FeaturedWork[] {
  return section && section.curated ? section.works : []
}

/** Работы категории, которых ещё нет в витрине (кандидаты на добавление). */
export function featuredCandidates(
  works: readonly Tile[],
  selectedIds: readonly number[],
): Tile[] {
  const selected = new Set(selectedIds)
  return works.filter((w) => !selected.has(w.id))
}

/** Добавить работу в хвост витрины (дубли бэк отвергает — тут они просто игнорируются). */
export function withWork(ids: readonly number[], id: number): number[] {
  return ids.includes(id) ? [...ids] : [...ids, id]
}

/** Убрать работу из витрины, сохранив порядок остальных. */
export function withoutWork(ids: readonly number[], id: number): number[] {
  return ids.filter((x) => x !== id)
}
