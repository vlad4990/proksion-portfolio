// Реестр известных работ (обход контракт-гэпа задачи 03): публичный листинг подкатегории
// возвращает работы только как тайлы {id,src,w,h} — без slug/title — и включает лишь работы С
// картинками. Полные данные работы доступны только по slug (GET /works/:cat/:sub/:work). Чтобы
// из списка можно было открыть/редактировать работу, показать название и видеть работы ещё без
// картинок, запоминаем (в рамках сессии) метаданные работ из ответов create/patch и детальной
// загрузки. Ключуем по (catSlug, subSlug) — оба известны из URL на всех экранах работ.
//
// Reorder/delete работают по id всегда (id есть в тайле); edit/manage-images требуют slug —
// доступны для работ, известных реестру. После reload реестр пуст (зафиксированный gap), но
// WorkDetail по slug в URL грузится напрямую и переживает reload.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export interface KnownWork {
  id: number
  catSlug: string
  subSlug: string
  slug: string
  title: string | null
}

/**
 * Чистое слияние: входящие записи перезаписывают прежние по id. Идемпотентно — если ничего не
 * изменилось, возвращает ИСХОДНЫЙ объект (та же ссылка), чтобы React не делал лишних рендеров.
 */
export function mergeKnown(
  prev: Readonly<Record<number, KnownWork>>,
  incoming: readonly KnownWork[],
): Record<number, KnownWork> {
  let changed = false
  const next: Record<number, KnownWork> = { ...prev }
  for (const work of incoming) {
    const existing = prev[work.id]
    if (
      !existing ||
      existing.slug !== work.slug ||
      existing.title !== work.title ||
      existing.catSlug !== work.catSlug ||
      existing.subSlug !== work.subSlug
    ) {
      next[work.id] = work
      changed = true
    }
  }
  return changed ? next : prev
}

interface WorkRegistryValue {
  /** Все известные сессии работы по id (стабильная ссылка — меняется только при remember/forget). */
  known: Readonly<Record<number, KnownWork>>
  remember: (works: KnownWork | readonly KnownWork[]) => void
  forget: (id: number) => void
}

const WorkRegistryContext = createContext<WorkRegistryValue | null>(null)

export function WorkRegistryProvider({ children }: { children: ReactNode }) {
  const [known, setKnown] = useState<Record<number, KnownWork>>({})

  const remember = useCallback((works: KnownWork | readonly KnownWork[]) => {
    const list = Array.isArray(works) ? works : [works as KnownWork]
    setKnown((prev) => mergeKnown(prev, list))
  }, [])

  const forget = useCallback((id: number) => {
    setKnown((prev) => {
      if (!(id in prev)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const value = useMemo<WorkRegistryValue>(
    () => ({ known, remember, forget }),
    [known, remember, forget],
  )

  return <WorkRegistryContext.Provider value={value}>{children}</WorkRegistryContext.Provider>
}

export function useWorkRegistry(): WorkRegistryValue {
  const ctx = useContext(WorkRegistryContext)
  if (!ctx) throw new Error('useWorkRegistry must be used within <WorkRegistryProvider>')
  return ctx
}
