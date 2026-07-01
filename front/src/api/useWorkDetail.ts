// Загрузка детали работы для модалки (задача 10, вариант B): GET /api/works/by-id/:id.
// Сегмент `:work` в URL модалки — это ЧИСЛОВОЙ id работы (решение пользователя, вариант B).
// Различаем 404 (несуществующий/невалидный id → редирект на листинг, не белый экран) и
// прочие ошибки сети/сервера (показываем «ошибка» с кнопкой закрытия).

import { useEffect, useState } from 'react'
import { ApiError, getWorkById } from './client'
import type { WorkDetailById } from './types'

/** Состояние загрузки детали: `notfound` — именно 404, `error` — сеть/прочее. */
export type WorkStatus = 'loading' | 'error' | 'notfound' | 'ready'

export interface WorkDetailData {
  detail: WorkDetailById | null
  status: WorkStatus
}

/** Грузит деталь работы по id из URL. Пока id не задан — `loading` (роут гарантирует его). */
export function useWorkDetail(id: string | undefined): WorkDetailData {
  const [detail, setDetail] = useState<WorkDetailById | null>(null)
  const [status, setStatus] = useState<WorkStatus>('loading')

  useEffect(() => {
    if (!id) {
      setStatus('loading')
      return
    }
    let cancelled = false
    setStatus('loading')
    setDetail(null)
    getWorkById(id)
      .then((data) => {
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
  }, [id])

  return { detail, status }
}
