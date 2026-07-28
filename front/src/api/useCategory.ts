// Одна категория для страницы `/projects/:cat` (GET /categories/:cat, спека §5.2):
// контент головы (kicker/meta_role/period/description_long), агрегаты (work_count,
// updated_max) и подкатегории для чипов-табов.
//
// Сессионный кэш по слагу — как detailCache в useWorkDetail: переключение табов
// подкатегорий и возврат из модалки категорию не перезапрашивают.
// 404 отличаем от прочих ошибок: неизвестный слаг → страница редиректит на /projects.

import { useEffect, useState } from 'react'
import { ApiError, getCategory } from './client'
import type { CategoryDetail } from './types'

/** Состояние загрузки категории: `notfound` — именно 404, `error` — сеть/прочее. */
export type CategoryStatus = 'loading' | 'error' | 'notfound' | 'ready'

const categoryCache = new Map<string, CategoryDetail>()

export interface CategoryData {
  category: CategoryDetail | null
  status: CategoryStatus
}

/** Грузит категорию по слагу из URL. Пока слаг не задан — `loading` (роут его гарантирует). */
export function useCategory(cat: string | undefined): CategoryData {
  const cached = cat ? categoryCache.get(cat) : undefined
  const [category, setCategory] = useState<CategoryDetail | null>(cached ?? null)
  const [status, setStatus] = useState<CategoryStatus>(cached ? 'ready' : 'loading')

  useEffect(() => {
    if (!cat) {
      setStatus('loading')
      return
    }
    const hit = categoryCache.get(cat)
    if (hit) {
      setCategory(hit)
      setStatus('ready')
      return
    }
    let cancelled = false
    setStatus('loading')
    setCategory(null)
    getCategory(cat)
      .then((data) => {
        categoryCache.set(cat, data)
        if (cancelled) return
        setCategory(data)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setStatus(err instanceof ApiError && err.status === 404 ? 'notfound' : 'error')
      })
    return () => {
      cancelled = true
    }
  }, [cat])

  return { category, status }
}
