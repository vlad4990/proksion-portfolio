// Общие примитивы admin-CRUD (задача 06): DI-контракт, защита (guard+CSRF из задачи 05),
// маппинг ошибок в 4xx, валидация входа (strict TS, без `any`), генерация слагов и обход
// дерева для каскадной чистки объектов S3.
//
// Сами репозитории (02), auth-хуки (05), slug-утилита (02) и storage (04) НЕ переписываются —
// только переиспользуются.

import type { Repos } from '../../repos.ts'
import type { ObjectStore } from '../../storage/s3.ts'
import { makeAuthGuard } from '../../auth/guard.ts'
import { makeCsrfGuard } from '../../auth/csrf.ts'
import { slugify, uniqueSlug } from '../../slug.ts'

/** Зависимости, прокидываемые во все admin-роутеры. `store` = null, если MinIO не настроен. */
export interface AdminDeps {
  repos: Repos
  store: ObjectStore | null
  jwtSecret: string
  /** Хук §9: дёргается на каждой успешной мутации (бэкап-дебаунс подключит задача 11). */
  onMutation: () => void
}

// ── Ошибки → HTTP-коды ───────────────────────────────────────────────────────────

/** Невалидный вход → 400. */
export class BadRequest extends Error {}
/** Ресурс не найден → 404. */
export class NotFound extends Error {}

export interface ErrorBody {
  error: string
  detail?: string
}

/**
 * Оборачивает тело хендлера: BadRequest → 400, NotFound → 404, прочее → 500.
 * Возврат значения отдаётся Elysia как тело ответа.
 */
export async function guarded<T>(
  set: { status?: number | string },
  fn: () => T | Promise<T>,
): Promise<T | ErrorBody> {
  try {
    return await fn()
  } catch (e) {
    if (e instanceof BadRequest) {
      set.status = 400
      return { error: 'bad_request', detail: e.message }
    }
    if (e instanceof NotFound) {
      set.status = 404
      return { error: 'not_found', detail: e.message }
    }
    set.status = 500
    return { error: 'internal_error' }
  }
}

/** beforeHandle-хуки защиты мутаций: сначала auth (401), затем CSRF (403) — порядок важен. */
export function protect(deps: AdminDeps) {
  return { beforeHandle: [makeAuthGuard(deps.jwtSecret), makeCsrfGuard()] }
}

// ── Валидация входа ────────────────────────────────────────────────────────────────

type Rec = Record<string, unknown>

/** Тело должно быть JSON-объектом (не массив, не null). */
export function asRecord(body: unknown): Rec {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequest('request body must be a JSON object')
  }
  return body as Rec
}

/** Числовой id из path-параметра (положительное целое). */
export function parseId(raw: string): number {
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1) throw new BadRequest(`invalid id "${raw}"`)
  return n
}

/** Обязательная непустая строка. */
export function requireString(obj: Rec, key: string): string {
  const v = obj[key]
  if (typeof v !== 'string' || v.trim() === '') {
    throw new BadRequest(`"${key}" must be a non-empty string`)
  }
  return v
}

/** Обязательное число. */
export function requireNumber(obj: Rec, key: string): number {
  const v = obj[key]
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new BadRequest(`"${key}" must be a number`)
  return v
}

/** Опциональная строка: ключ отсутствует/undefined → undefined; иначе обязана быть строкой. */
export function optString(obj: Rec, key: string): string | undefined {
  if (!(key in obj) || obj[key] === undefined) return undefined
  const v = obj[key]
  if (typeof v !== 'string') throw new BadRequest(`"${key}" must be a string`)
  return v
}

/** Опциональная строка-или-null: отсутствует → undefined; null → null; иначе строка. */
export function optStringOrNull(obj: Rec, key: string): string | null | undefined {
  if (!(key in obj)) return undefined
  const v = obj[key]
  if (v === undefined) return undefined
  if (v === null) return null
  if (typeof v === 'string') return v
  throw new BadRequest(`"${key}" must be a string or null`)
}

/** Опциональное число: отсутствует/undefined → undefined; иначе конечное число. */
export function optNumber(obj: Rec, key: string): number | undefined {
  if (!(key in obj) || obj[key] === undefined) return undefined
  const v = obj[key]
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new BadRequest(`"${key}" must be a number`)
  return v
}

/** Опциональное число-или-null. */
export function optNumberOrNull(obj: Rec, key: string): number | null | undefined {
  if (!(key in obj)) return undefined
  const v = obj[key]
  if (v === undefined) return undefined
  if (v === null) return null
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new BadRequest(`"${key}" must be a number or null`)
  }
  return v
}

/** Массив целых (для reorder). */
export function requireIntArray(obj: Rec, key: string): number[] {
  const v = obj[key]
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'number' || !Number.isInteger(x))) {
    throw new BadRequest(`"${key}" must be an array of integers`)
  }
  return v as number[]
}

// ── Слаги / порядок ─────────────────────────────────────────────────────────────────

/** Следующий sort_order «в конец»: max(existing)+1 (пустой список → 0). */
export function nextSortOrder(orders: readonly number[]): number {
  let max = -1
  for (const o of orders) if (o > max) max = o
  return max + 1
}

/** slugify(source) с гарантией уникальности среди `existing`. */
export function makeSlug(source: string, fallback: string, existing: Iterable<string>): string {
  return uniqueSlug(slugify(source, fallback), existing)
}

// ── Обход дерева (для каскадной чистки S3) ────────────────────────────────────────

/** id всех работ подкатегории. */
export function workIdsUnderSubcategory(repos: Repos, subcategoryId: number): number[] {
  return repos.work.list(subcategoryId).map((w) => w.id)
}

/** id всех работ категории (через её подкатегории). */
export function workIdsUnderCategory(repos: Repos, categoryId: number): number[] {
  return repos.subcategory
    .list(categoryId)
    .flatMap((sub) => workIdsUnderSubcategory(repos, sub.id))
}

/** Удаляет ВСЕ объекты S3 работы (`images/{workId}/…`). No-op без store. */
export async function purgeWorkObjects(store: ObjectStore | null, workId: number): Promise<void> {
  if (!store) return
  await store.deletePrefix(`images/${workId}/`)
}
