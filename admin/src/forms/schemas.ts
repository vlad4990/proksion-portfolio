// Схемы валидации и маппинг форм ↔ payload API (задача 08, шаги 1–2; методология — TDD).
// Категория и подкатегория используют одну форму «именованной сущности» (title обязателен);
// у работы title необязателен (work.title nullable, см. back/src/types.ts). Описание хранится
// как markdown-строка и НЕ тримится (сохраняем форматирование), но пустое/пробельное → null.

import { z } from 'zod'

import type { CategoryInput, SubcategoryInput, WorkInput, WorkPatchInput } from '@/api/content'
import type { WorkDetail } from '@/api/types'

// ── Схемы ────────────────────────────────────────────────────────────────────────────

/** Категория/подкатегория: название обязательно; слаг и описание — опциональны (back сгенерит). */
export const namedEntitySchema = z.object({
  title: z.string().trim().min(1, 'Введите название'),
  slug: z.string().trim(),
  description: z.string(),
})
export type NamedEntityValues = z.infer<typeof namedEntitySchema>

/** Работа: название необязательно (слаг сгенерится из него или из явного slug). */
export const workSchema = z.object({
  title: z.string().trim(),
  slug: z.string().trim(),
  description: z.string(),
})
export type WorkFormValues = z.infer<typeof workSchema>

// ── Маппинг form → payload ──────────────────────────────────────────────────────────────

/** Пусто/пробелы → null (очистить поле); иначе исходное значение без тримминга. */
export function emptyToNull(value: string): string | null {
  return value.trim() === '' ? null : value
}

/** Категория/подкатегория: общий payload `{ title, slug?, description }`. Пустой slug опускаем. */
export function toNamedEntityPayload(values: NamedEntityValues): {
  title: string
  slug?: string
  description: string | null
} {
  const payload: { title: string; slug?: string; description: string | null } = {
    title: values.title,
    description: emptyToNull(values.description),
  }
  if (values.slug !== '') payload.slug = values.slug
  return payload
}

export const toCategoryInput = (values: NamedEntityValues): CategoryInput =>
  toNamedEntityPayload(values)

export const toSubcategoryInput = (
  values: NamedEntityValues,
  categoryId: number,
): SubcategoryInput => ({ category_id: categoryId, ...toNamedEntityPayload(values) })

/** Работа на create: `{ subcategory_id, title|null, slug?, description }`. */
export function toWorkInput(values: WorkFormValues, subcategoryId: number): WorkInput {
  const input: WorkInput = {
    subcategory_id: subcategoryId,
    title: emptyToNull(values.title),
    description: emptyToNull(values.description),
  }
  if (values.slug !== '') input.slug = values.slug
  return input
}

/** Работа на patch: `{ title|null, slug?, description }` (cover/order меняются отдельно). */
export function toWorkPatch(values: WorkFormValues): WorkPatchInput {
  const patch: WorkPatchInput = {
    title: emptyToNull(values.title),
    description: emptyToNull(values.description),
  }
  if (values.slug !== '') patch.slug = values.slug
  return patch
}

// ── Маппинг entity → form (для предзаполнения при редактировании) ─────────────────────────

export function namedEntityToValues(entity: {
  title: string
  slug: string
  description: string | null
}): NamedEntityValues {
  return { title: entity.title, slug: entity.slug, description: entity.description ?? '' }
}

export function workDetailToValues(work: WorkDetail): WorkFormValues {
  return { title: work.title ?? '', slug: work.slug, description: work.description ?? '' }
}

/** Дефолты пустой формы (создание). */
export const emptyNamedEntity: NamedEntityValues = { title: '', slug: '', description: '' }
export const emptyWork: WorkFormValues = { title: '', slug: '', description: '' }
