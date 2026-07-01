// Открытие модалки работы по клику на тайл (задача 10, вариант B) — общее для ОБОИХ деревьев.
// URL модалки — /projects/:cat/:sub/:id (сегмент :work = ЧИСЛОВОЙ id работы).
//   • Подкатегорийный листинг /projects/:cat/:sub — cat/sub есть в URL → навигация сразу.
//   • Глобальный листинг /projects — у тайла нет cat/sub → резолвим их из /works/by-id/:id
//     и строим канонический URL. Если деталь недоступна, тайл просто не открывается.

import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router'
import { getWorkById } from '../api/client'

export function useOpenWork(): (id: number) => void {
  const { cat, sub } = useParams()
  const navigate = useNavigate()
  return useCallback(
    (id: number) => {
      if (cat && sub) {
        navigate(`/projects/${cat}/${sub}/${id}`)
        return
      }
      getWorkById(id)
        .then((d) => navigate(`/projects/${d.cat}/${d.sub}/${id}`))
        .catch(() => {
          /* деталь недоступна — тайл не открывается (без белого экрана) */
        })
    },
    [cat, sub, navigate],
  )
}
