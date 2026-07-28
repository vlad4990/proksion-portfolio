// Навигация листинга: категории с подкатегориями, счётчиками и контентом секций
// (GET /categories, спека редизайна §5.2). Нужна корневой /projects (порядок и головы
// секций, статы hero) и мобильному дереву.
//
// СЕССИОННЫЙ КЭШ (модульный, живёт до перезагрузки страницы) — как в useTags/useFeatured:
// повторный маунт (возврат из модалки, смена дерева desktop/mobile) не перезапрашивает
// и не мигает скелетоном; ревалидации нет осознанно (контент меняется через админку редко).

import { useEffect, useState } from 'react'
import { getCategories } from './client'
import type { LoadStatus } from './status'
import type { CategoryNav } from './types'

let categoriesCache: CategoryNav[] | null = null

export interface CategoriesData {
  /** Категории в порядке `sort_order` (пустой массив, пока не готово / при ошибке). */
  categories: CategoryNav[]
  status: LoadStatus
}

export function useCategories(): CategoriesData {
  const [categories, setCategories] = useState<CategoryNav[]>(() => categoriesCache ?? [])
  const [status, setStatus] = useState<LoadStatus>(() => (categoriesCache ? 'ready' : 'loading'))

  useEffect(() => {
    if (categoriesCache) return
    let cancelled = false
    getCategories()
      .then((data) => {
        categoriesCache = data
        if (cancelled) return
        setCategories(data)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { categories, status }
}
