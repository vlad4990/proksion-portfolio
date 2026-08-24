// Загрузка детали работы для модалки. КАНОНИЧЕСКИЙ источник — слаг (спека редизайна §5.6):
// `/projects/:cat/:sub/:work`, где `:work` — слаг работы → GET /works/:cat/:sub/:work.
// ЛЕГАСИ-ветка: если `:work` — целое число (старые ссылки задачи 10, вариант B), деталь
// грузится по id (GET /works/by-id/:id), а модалка `replace`-редиректит на слаговый URL —
// слаги пути приходят в самом ответе. Различаем 404 (несуществующая работа → редирект на
// листинг, не белый экран) и прочие ошибки сети/сервера («ошибка» с кнопкой закрытия).
//
// Сессионный кэш по ключу вида (`slug:cat/sub/work` либо `id:123`): повторное открытие той
// же работы — мгновенно, без «Загрузка…» (как кэш листинга в useCategories, без ревалидации).
// Ответ, полученный по id, кладём и под слаговый ключ — после редиректа модалка не
// перезапрашивает то же самое.

import { useEffect, useState } from 'react'
import { ApiError, getWorkById, getWorkBySlug } from './client'
import type { WorkDetail } from './types'

/** Состояние загрузки детали: `notfound` — именно 404, `error` — сеть/прочее. */
export type WorkStatus = 'loading' | 'error' | 'notfound' | 'ready'

const detailCache = new Map<string, WorkDetail>()
/** Канонический слаговый путь по легаси-id — чтобы редирект работал и на кэш-хите. */
const canonicalPathCache = new Map<string, string>()

const slugKey = (cat: string, sub: string, work: string): string => `slug:${cat}/${sub}/${work}`

/** Слаговые ключи, по которым префетч уже в полёте (дедуп ховеров). */
const inflight = new Set<string>()

/**
 * Фоновый префетч детали работы (ховер/тап по тайлу, lib/prefetch): кладёт ответ в тот же
 * сессионный кэш, что читает useWorkDetail — открытие модалки после ховера мгновенное.
 * Резолвится деталью (для прогрева картинок); ошибки глотает (это только оптимизация),
 * при уже идущем запросе резолвится null — второй прогрев не нужен.
 */
export function prefetchWorkDetail(cat: string, sub: string, work: string): Promise<WorkDetail | null> {
  const key = slugKey(cat, sub, work)
  const hit = detailCache.get(key)
  if (hit) return Promise.resolve(hit)
  if (inflight.has(key)) return Promise.resolve(null)
  inflight.add(key)
  return getWorkBySlug(cat, sub, work)
    .then((data) => {
      detailCache.set(key, data)
      return data
    })
    .catch(() => null)
    .finally(() => {
      inflight.delete(key)
    })
}

/** `:work` — легаси-ссылка (числовой id работы), а не слаг? */
export function isLegacyWorkParam(work: string | undefined): boolean {
  return work !== undefined && /^\d+$/.test(work)
}

export interface WorkDetailData {
  detail: WorkDetail | null
  status: WorkStatus
  /**
   * Канонический слаговый путь работы — не `null` только когда деталь загружена по легаси-id:
   * модалка обязана сделать `navigate(canonicalPath, { replace: true })`.
   */
  canonicalPath: string | null
}

/**
 * Грузит деталь работы по параметрам маршрута модалки. Пока параметров нет — `loading`
 * (роут их гарантирует).
 */
export function useWorkDetail(
  cat: string | undefined,
  sub: string | undefined,
  work: string | undefined,
): WorkDetailData {
  const legacy = isLegacyWorkParam(work)
  const key =
    work === undefined
      ? null
      : legacy
        ? `id:${work}`
        : cat && sub
          ? slugKey(cat, sub, work)
          : null

  const cached = key ? detailCache.get(key) : undefined
  const [detail, setDetail] = useState<WorkDetail | null>(cached ?? null)
  const [status, setStatus] = useState<WorkStatus>(cached ? 'ready' : 'loading')

  useEffect(() => {
    if (!key || work === undefined) {
      setStatus('loading')
      return
    }
    const hit = detailCache.get(key)
    if (hit) {
      setDetail(hit)
      setStatus('ready')
      return
    }
    let cancelled = false
    setStatus('loading')
    setDetail(null)
    const load: Promise<WorkDetail> = legacy
      ? getWorkById(work).then((data) => {
          // Слаги пути берём из ответа, а не из URL: легаси-ссылку могли сохранить с любыми
          // `cat`/`sub` — канонический путь всегда определяет бэкенд.
          const canonical = `/projects/${data.cat}/${data.sub}/${data.slug}`
          canonicalPathCache.set(key, canonical)
          detailCache.set(slugKey(data.cat, data.sub, data.slug), data)
          return data
        })
      : getWorkBySlug(cat ?? '', sub ?? '', work)
    load
      .then((data) => {
        detailCache.set(key, data)
        if (cancelled) return
        setDetail(data)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setStatus(err instanceof ApiError && err.status === 404 ? 'notfound' : 'error')
      })
    return () => {
      cancelled = true
    }
  }, [key, legacy, cat, sub, work])

  const canonicalPath = legacy && key && status === 'ready' ? canonicalPathCache.get(key) ?? null : null

  return { detail, status, canonicalPath }
}
