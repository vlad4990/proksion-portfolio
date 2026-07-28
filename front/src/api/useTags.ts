// Глобальные теги-фильтры чипов корневой /projects (GET /tags, спека редизайна §5.3).
//
// СЕССИОННЫЙ КЭШ (модульный, живёт до перезагрузки страницы) — как в useCategories:
// повторный маунт (возврат из модалки, смена дерева desktop/mobile) не перезапрашивает
// и не мигает скелетоном; ревалидации нет осознанно (теги меняются через админку редко).

import { useEffect, useState } from 'react'
import { getTags } from './client'
import type { LoadStatus } from './status'
import type { TagNav } from './types'

let tagsCache: TagNav[] | null = null

export interface TagsData {
  /** Теги в порядке `sort_order` (пустой массив, пока не готово / при ошибке). */
  tags: TagNav[]
  status: LoadStatus
}

export function useTags(): TagsData {
  const [tags, setTags] = useState<TagNav[]>(() => tagsCache ?? [])
  const [status, setStatus] = useState<LoadStatus>(() => (tagsCache ? 'ready' : 'loading'))

  useEffect(() => {
    if (tagsCache) return
    let cancelled = false
    getTags()
      .then((data) => {
        tagsCache = data
        if (cancelled) return
        setTags(data)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { tags, status }
}
