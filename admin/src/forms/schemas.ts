// Схемы валидации и маппинг форм ↔ payload API (задача 08, шаги 1–2; методология — TDD).
// Категория и подкатегория используют одну форму «именованной сущности» (title обязателен);
// у работы title необязателен (work.title nullable, см. back/src/types.ts). Описание хранится
// как markdown-строка и НЕ тримится (сохраняем форматирование), но пустое/пробельное → null.

import { z } from 'zod'

import type {
  CategoryInput,
  CategoryPatchInput,
  SubcategoryInput,
  TagInput,
  WorkInput,
  WorkPatchInput,
} from '@/api/content'
import type { CategoryDetail, DisplayVariant, WorkDetail } from '@/api/types'

// ── Схемы ────────────────────────────────────────────────────────────────────────────

/** Категория/подкатегория: название обязательно; слаг и описание — опциональны (back сгенерит). */
export const namedEntitySchema = z.object({
  title: z.string().trim().min(1, 'Введите название'),
  slug: z.string().trim(),
  description: z.string(),
})
export type NamedEntityValues = z.infer<typeof namedEntitySchema>

/** Варианты вёрстки секции категории на `/projects` (спека редизайна §2.1) + подписи для select. */
export const DISPLAY_VARIANTS = ['showcase', 'strip', 'cards'] as const

export const DISPLAY_VARIANT_LABELS: Record<DisplayVariant, string> = {
  showcase: 'Витрина (hero + сетка)',
  strip: 'Полоса тайлов',
  cards: 'Карточки с текстом',
}

/**
 * Категория: именованная сущность + контент секции/страницы (редизайн §5.5). Контентные поля
 * уходят только в PATCH — на создании их принимает не бэк, а форма редактирования.
 */
export const categorySchema = namedEntitySchema.extend({
  kicker: z.string(),
  meta_role: z.string(),
  period: z.string(),
  description_long: z.string(),
  display_variant: z.enum(DISPLAY_VARIANTS),
})
export type CategoryFormValues = z.infer<typeof categorySchema>

/** Тег: название обязательно, слаг опционален (бэк сгенерит транслит) и стабилен после создания. */
export const tagSchema = z.object({
  title: z.string().trim().min(1, 'Введите название'),
  slug: z.string().trim(),
})
export type TagFormValues = z.infer<typeof tagSchema>

/**
 * Работа: название необязательно (слаг сгенерится из него или из явного slug).
 * `seamless` — чекбокс «единое полотно»: лента картинок в модалке идёт стык-в-стык,
 * без зазоров (для работ, которые сами являются нарезкой одного макета).
 * `carousel` — чекбокс «карусель»: десктопная модалка показывает картинки горизонтальной
 * псевдо-каруселью вместо вертикальной ленты (для работ, где картинки после главной сильно
 * ниже её); мобилка и работы с одной картинкой флаг игнорируют.
 */
export const workSchema = z.object({
  title: z.string().trim(),
  slug: z.string().trim(),
  description: z.string(),
  seamless: z.boolean(),
  carousel: z.boolean(),
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

/**
 * Категория на patch: базовые поля + контент секции. Пустые контентные поля → `null`
 * (очистить), `display_variant` уходит всегда (select ограничен тремя значениями).
 */
export function toCategoryPatch(values: CategoryFormValues): CategoryPatchInput {
  return {
    ...toNamedEntityPayload(values),
    kicker: emptyToNull(values.kicker),
    meta_role: emptyToNull(values.meta_role),
    period: emptyToNull(values.period),
    description_long: emptyToNull(values.description_long),
    display_variant: values.display_variant,
  }
}

/** Тег на create: `{ title, slug? }` — пустой слаг опускаем (бэк сгенерит транслит). */
export function toTagInput(values: TagFormValues): TagInput {
  const input: TagInput = { title: values.title }
  if (values.slug !== '') input.slug = values.slug
  return input
}

/**
 * Тег на patch: слаг шлём ТОЛЬКО когда он реально изменён — переименование не должно
 * трогать ссылку (`/projects?tag=<slug>`), а лишний слаг в теле бэк бы перепроверил на дубли.
 */
export function toTagPatch(values: TagFormValues, currentSlug: string): Partial<TagInput> {
  const patch: Partial<TagInput> = { title: values.title }
  if (values.slug !== '' && values.slug !== currentSlug) patch.slug = values.slug
  return patch
}

export const toSubcategoryInput = (
  values: NamedEntityValues,
  categoryId: number,
): SubcategoryInput => ({ category_id: categoryId, ...toNamedEntityPayload(values) })

/** Работа на create: `{ subcategory_id, title|null, slug?, description, seamless, carousel }`. */
export function toWorkInput(values: WorkFormValues, subcategoryId: number): WorkInput {
  const input: WorkInput = {
    subcategory_id: subcategoryId,
    title: emptyToNull(values.title),
    description: emptyToNull(values.description),
    seamless: values.seamless,
    carousel: values.carousel,
  }
  if (values.slug !== '') input.slug = values.slug
  return input
}

/**
 * Работа на patch: `{ title|null, slug?, description, seamless, carousel }` (cover/order
 * меняются отдельно). Флаги уходят всегда — чекбоксы всегда имеют определённое значение.
 */
export function toWorkPatch(values: WorkFormValues): WorkPatchInput {
  const patch: WorkPatchInput = {
    title: emptyToNull(values.title),
    description: emptyToNull(values.description),
    seamless: values.seamless,
    carousel: values.carousel,
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
  return {
    title: work.title ?? '',
    slug: work.slug,
    description: work.description ?? '',
    seamless: work.seamless,
    carousel: work.carousel,
  }
}

/** Категория → форма: все nullable-поля контента разворачиваются в пустые строки. */
export function categoryDetailToValues(category: CategoryDetail): CategoryFormValues {
  return {
    ...namedEntityToValues(category),
    kicker: category.kicker ?? '',
    meta_role: category.meta_role ?? '',
    period: category.period ?? '',
    description_long: category.description_long ?? '',
    display_variant: category.display_variant,
  }
}

export function tagToValues(tag: { title: string; slug: string }): TagFormValues {
  return { title: tag.title, slug: tag.slug }
}

/** Дефолты пустой формы (создание). */
export const emptyNamedEntity: NamedEntityValues = { title: '', slug: '', description: '' }
export const emptyWork: WorkFormValues = {
  title: '',
  slug: '',
  description: '',
  seamless: false,
  carousel: false,
}
export const emptyTag: TagFormValues = { title: '', slug: '' }
