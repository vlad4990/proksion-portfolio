// Витрины секций корневой /projects (GET /featured, спека редизайна §5.3): по секции
// на категорию, работы — кураторский список либо fallback (`curated: false`).
//
// Сессионный кэш — как в useTags/useProjects: один запрос на сессию, возврат из модалки
// и смена таба тегов витрину не перезапрашивают.

import { useEffect, useState } from 'react'
import { getFeatured } from './client'
import type { LoadStatus } from './useProjects'
import type { FeaturedSection } from './types'

let featuredCache: FeaturedSection[] | null = null

export interface FeaturedData {
  /** Секции в порядке `category.sort_order`. */
  sections: FeaturedSection[]
  status: LoadStatus
}

export function useFeatured(): FeaturedData {
  const [sections, setSections] = useState<FeaturedSection[]>(() => featuredCache ?? [])
  const [status, setStatus] = useState<LoadStatus>(() => (featuredCache ? 'ready' : 'loading'))

  useEffect(() => {
    if (featuredCache) return
    let cancelled = false
    getFeatured()
      .then((data) => {
        featuredCache = data
        if (cancelled) return
        setSections(data)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { sections, status }
}

/** Витрина конкретной категории по слагу (или `undefined`, если её нет в ответе). */
export function findSection(
  sections: FeaturedSection[],
  cat: string | undefined,
): FeaturedSection | undefined {
  return cat ? sections.find((s) => s.cat === cat) : undefined
}
