// Раскладка кураторской витрины секции по шаблону варианта (спека редизайна §2.1(3)).
// Чистые функции — общие для обоих деревьев: сама вёрстка у desktop/mobile разная,
// а «сколько работ куда» — одно и то же.
//
// Работ в витрине может быть меньше шаблона (кураторский список короткий или fallback):
// ряды сокращаются, лишние слоты не рендерятся; работы сверх шаблона отбрасываются.

import type { FeaturedWork } from '../api/types'

/** Максимум слотов витрины по вариантам (дизайн-ориентиры §2.1(3)). */
export const SHOWCASE_MAX = 7
export const STRIP_MAX_WIDE = 4
export const STRIP_MAX_DENSE = 5
export const CARDS_MAX = 4

/** Ряды варианта `showcase`: hero-тайл + до 2 работ ряда A + нижний ряд из 4. */
export interface ShowcaseRows {
  /** Hero-слот (первая работа витрины) — с пилюлей-подписью; `undefined`, если работ нет. */
  hero: FeaturedWork | undefined
  /** Соседи hero в ряду A: до 2 работ. */
  side: FeaturedWork[]
  /** Нижний ряд: до 4 работ. */
  rowB: FeaturedWork[]
}

export function splitShowcase(works: FeaturedWork[]): ShowcaseRows {
  const list = works.slice(0, SHOWCASE_MAX)
  return { hero: list[0], side: list.slice(1, 3), rowB: list.slice(3, 7) }
}

/** Плотный ли ряд варианта `strip`: 5+ работ — низкие тайлы, до 4 — высокие. */
export function isDenseStrip(count: number): boolean {
  return count >= STRIP_MAX_DENSE
}

/** Работы ряда `strip` с учётом плотности (лишние не рендерим). */
export function stripWorks(works: FeaturedWork[]): FeaturedWork[] {
  return works.slice(0, isDenseStrip(works.length) ? STRIP_MAX_DENSE : STRIP_MAX_WIDE)
}

/** Карточки варианта `cards`. */
export function cardWorks(works: FeaturedWork[]): FeaturedWork[] {
  return works.slice(0, CARDS_MAX)
}

/** Разбивка на ряды по `size` элементов (мобильные пары/тройки витрины). */
export function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size))
  return rows
}
