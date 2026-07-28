// Инфинити-скролл листинга работ (спека редизайна §2.3.5, §5.4): GET /works с фильтрами
// category/subcategory/tag и SQL-пагинацией. Порция — 24 (дефолт лимита бэкенда).
//
// СЕССИОННЫЙ КЭШ достигнутого offset'а (модульная Map, ключ = вид листинга): возврат из
// модалки работы и переключение табов подкатегорий не перезапрашивают уже догруженное и не
// мигают скелетонами — состояние инициализируется из кэша синхронно (как в useCategories).
//
// Сентинел — нативный IntersectionObserver (новых зависимостей не добавляем): `sentinelRef`
// вешается на пустой div под гридом; наблюдение отключается, когда грузить нечего
// (`!hasMore`) или уже идёт догрузка. SSR-guard не нужен — это SPA, кода вне браузера нет.

import { useCallback, useEffect, useRef, useState } from 'react'
import { getWorksFiltered } from './client'
import type { LoadStatus } from './status'
import type { Tile } from './types'

/** Порция догрузки = дефолтный лимит `/works` (спека §5.4). */
export const WORKS_PAGE_SIZE = 24

/** Насколько раньше сентинела начинать догрузку (высота ~экрана — подгрузка незаметна). */
const SENTINEL_MARGIN = '600px'

export interface InfiniteWorksParams {
  /** Слаг категории (`undefined` — все работы). */
  cat?: string | undefined
  /** Слаг подкатегории (требует `cat`; `undefined` — таб «ВСЕ»). */
  sub?: string | undefined
  /** Слаг тега-фильтра (`undefined` — без фильтра). */
  tag?: string | undefined
  /** Размер порции; по умолчанию `WORKS_PAGE_SIZE`. */
  limit?: number | undefined
}

interface WorksCacheEntry {
  tiles: Tile[]
  /** Полное число работ вида листинга с учётом фильтров (для «ПОКАЗАНО N ИЗ M»). */
  total: number
}

const worksCache = new Map<string, WorksCacheEntry>()

/** Ключ вида листинга: `cat/sub?tag=` (пустые части — «нет фильтра»). */
const worksKey = (
  cat: string | undefined,
  sub: string | undefined,
  tag: string | undefined,
): string => `${cat ?? ''}/${sub ?? ''}?tag=${tag ?? ''}`

interface WorksState extends WorksCacheEntry {
  key: string
  status: LoadStatus
}

const initialState = (key: string): WorksState => {
  const cached = worksCache.get(key)
  return cached
    ? { key, tiles: cached.tiles, total: cached.total, status: 'ready' }
    : { key, tiles: [], total: 0, status: 'loading' }
}

export interface InfiniteWorksData {
  /** Показанные тайлы (накопленные по всем догруженным порциям). */
  tiles: Tile[]
  /** Всего работ в этом виде листинга — правая часть «ПОКАЗАНО N ИЗ M». */
  total: number
  status: LoadStatus
  /** Есть ли ещё непоказанные работы. */
  hasMore: boolean
  /** Идёт догрузка порции (для скелетон-тайлов под гридом). */
  loadingMore: boolean
  /** Догрузить следующую порцию (обычно зовёт сентинел, но можно и кнопкой). */
  loadMore: () => void
  /** Колбэк-ref для пустого div-сентинела под гридом. */
  sentinelRef: (node: HTMLElement | null) => void
}

export function useInfiniteWorks(params: InfiniteWorksParams): InfiniteWorksData {
  const { cat, sub, tag, limit = WORKS_PAGE_SIZE } = params
  const key = worksKey(cat, sub, tag)

  const [state, setState] = useState<WorksState>(() => initialState(key))
  const [loadingMore, setLoadingMore] = useState(false)
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null)

  // Смена вида листинга — синхронно в рендере (render-phase update): ни кадра со старыми
  // тайлами, кэшированный вид появляется мгновенно.
  if (state.key !== key) {
    setState(initialState(key))
    setLoadingMore(false)
  }

  // Первая порция — только при кэш-промахе текущего ключа.
  useEffect(() => {
    if (state.key !== key || state.status !== 'loading') return
    let cancelled = false
    getWorksFiltered({ category: cat, subcategory: sub, tag, offset: 0, limit })
      .then((page) => {
        const entry: WorksCacheEntry = { tiles: page.items, total: page.total }
        worksCache.set(key, entry)
        if (cancelled) return
        setState({ key, ...entry, status: 'ready' })
      })
      .catch(() => {
        if (!cancelled) setState({ key, tiles: [], total: 0, status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [key, state.key, state.status, cat, sub, tag, limit])

  const hasMore = state.status === 'ready' && state.tiles.length < state.total

  // Ключ на момент резолва — чтобы порция, догруженная после переключения таба,
  // не попала в чужой вид листинга.
  const keyRef = useRef(key)
  useEffect(() => {
    keyRef.current = key
  }, [key])

  const loadMore = (): void => {
    if (!hasMore || loadingMore) return
    const shown = state.tiles
    setLoadingMore(true)
    getWorksFiltered({ category: cat, subcategory: sub, tag, offset: shown.length, limit })
      .then((page) => {
        if (keyRef.current !== key) return
        const entry: WorksCacheEntry = { tiles: [...shown, ...page.items], total: page.total }
        worksCache.set(key, entry)
        setState({ key, ...entry, status: 'ready' })
      })
      .catch(() => {
        /* порция не догрузилась — сентинел снова сработает при скролле */
      })
      .finally(() => setLoadingMore(false))
  }

  // Свежий loadMore для колбэка observer'а: переподписка на каждый рендер была бы
  // расточительной, а замыкание обязано видеть актуальные tiles/total.
  const loadMoreRef = useRef(loadMore)
  useEffect(() => {
    loadMoreRef.current = loadMore
  })

  const sentinelRef = useCallback((node: HTMLElement | null) => setSentinel(node), [])

  useEffect(() => {
    if (!sentinel || !hasMore || loadingMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMoreRef.current()
      },
      { rootMargin: SENTINEL_MARGIN },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinel, hasMore, loadingMore])

  return {
    tiles: state.tiles,
    total: state.total,
    status: state.status,
    hasMore,
    loadingMore,
    loadMore,
    sentinelRef,
  }
}
