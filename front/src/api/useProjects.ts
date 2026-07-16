// Единый источник данных листинга для ОБОИХ деревьев (desktop + mobile).
// Раньше категории/тайлы хардкодились и дублировались между ProjectsScreen.tsx и
// MobileProjects.tsx (front/CLAUDE.md) — теперь оба берут навигацию и тайлы отсюда.
//
// Навигация (категории + подкатегории) грузится один раз; тайлы — по маршруту:
//   `/projects`            → все работы (GET /works)
//   `/projects/:cat/:sub`  → работы подкатегории (GET /categories/:cat/:sub)
//
// СЕССИОННЫЙ КЭШ (модульный, живёт до перезагрузки страницы): повторные заходы на
// «Проекты» и закрытие модалки не перезапрашивают данные и не мигают скелетонами —
// состояние инициализируется из кэша синхронно. Ревалидации нет осознанно: контент
// меняется редко (через админку), свежие данные приходят со следующей загрузкой страницы.

import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { getCategories, getSubcategoryListing, getWorks } from './client'
import type { CategoryNav, Tile } from './types'

/** Состояние асинхронной загрузки части данных. */
export type LoadStatus = 'loading' | 'error' | 'ready'

let categoriesCache: CategoryNav[] | null = null

interface TilesCacheEntry {
  tiles: Tile[]
  /** Полное число работ листинга (для «Показать ещё» глобального листинга). */
  total: number
}

/** Ключ — вид листинга: 'all' (все работы) либо `${cat}/${sub}`. */
const tilesCache = new Map<string, TilesCacheEntry>()

const tilesKey = (cat: string | undefined, sub: string | undefined): string =>
  cat && sub ? `${cat}/${sub}` : 'all'

interface TilesState extends TilesCacheEntry {
  key: string
  status: LoadStatus
}

const initialTilesState = (key: string): TilesState => {
  const cached = tilesCache.get(key)
  return cached
    ? { key, tiles: cached.tiles, total: cached.total, status: 'ready' }
    : { key, tiles: [], total: 0, status: 'loading' }
}

export interface ProjectsData {
  /** Навигация: категории с подкатегориями (для сайдбара/чипов). */
  categories: CategoryNav[]
  categoriesStatus: LoadStatus
  /** Тайлы текущего вида (все работы либо работы подкатегории). */
  tiles: Tile[]
  tilesStatus: LoadStatus
  /** Активная категория строго по slug из URL; `undefined` на «всех работах» (`/projects`). */
  activeCategory: CategoryNav | undefined
  /** Slug активной подкатегории (по URL, иначе первая выбранной категории). */
  activeSubSlug: string | undefined
  /** Сырые параметры маршрута. */
  cat: string | undefined
  sub: string | undefined
  /** Есть ли непоказанные работы (пагинация есть только у глобального `/works`). */
  hasMore: boolean
  /** Идёт подгрузка следующей страницы (для disabled-состояния кнопки). */
  loadingMore: boolean
  /** Подгрузить следующую страницу глобального листинга (append к текущим тайлам). */
  loadMore: () => void
}

export function useProjects(): ProjectsData {
  const { cat, sub } = useParams()
  const key = tilesKey(cat, sub)

  const [categories, setCategories] = useState<CategoryNav[]>(() => categoriesCache ?? [])
  const [categoriesStatus, setCategoriesStatus] = useState<LoadStatus>(() =>
    categoriesCache ? 'ready' : 'loading',
  )
  const [tilesState, setTilesState] = useState<TilesState>(() => initialTilesState(key))
  const [loadingMore, setLoadingMore] = useState(false)

  // Смена вида листинга — синхронно в рендере (render-phase update): ни кадра
  // со старыми тайлами, кэшированный вид появляется мгновенно.
  if (tilesState.key !== key) setTilesState(initialTilesState(key))

  // Навигация — один раз на сессию.
  useEffect(() => {
    if (categoriesCache) return
    let cancelled = false
    getCategories()
      .then((data) => {
        categoriesCache = data
        if (cancelled) return
        setCategories(data)
        setCategoriesStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setCategoriesStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Тайлы — только при кэш-промахе текущего ключа.
  useEffect(() => {
    if (tilesState.key !== key || tilesState.status !== 'loading') return
    let cancelled = false
    const load =
      cat && sub
        ? getSubcategoryListing(cat, sub).then(
            (listing): TilesCacheEntry => ({ tiles: listing.works, total: listing.works.length }),
          )
        : getWorks().then((page): TilesCacheEntry => ({ tiles: page.items, total: page.total }))
    load
      .then((data) => {
        tilesCache.set(key, data)
        if (cancelled) return
        setTilesState({ key, ...data, status: 'ready' })
      })
      .catch(() => {
        if (!cancelled) setTilesState({ key, tiles: [], total: 0, status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [key, tilesState.key, tilesState.status, cat, sub])

  // Подгрузка следующей страницы: только глобальный листинг (подкатегории приходят целиком).
  // GET /works с offset = сколько уже показано; накопленный список кладём обратно в кэш,
  // чтобы после модалки/навигации пользователь вернулся ко всем догруженным работам.
  const hasMore = tilesState.status === 'ready' && tilesState.tiles.length < tilesState.total
  const loadMore = (): void => {
    if (key !== 'all' || !hasMore || loadingMore) return
    setLoadingMore(true)
    getWorks(tilesState.tiles.length)
      .then((page) => {
        const entry: TilesCacheEntry = {
          tiles: [...tilesState.tiles, ...page.items],
          total: page.total,
        }
        tilesCache.set(key, entry)
        setTilesState({ key, ...entry, status: 'ready' })
      })
      .catch(() => {
        /* подгрузка не удалась — кнопка остаётся, клик можно повторить */
      })
      .finally(() => setLoadingMore(false))
  }

  // Без fallback на первую категорию: на `/projects` показаны ВСЕ работы, и подсвечивать
  // какую-то категорию как активную было бы враньём (для этого есть пункт «Все работы»).
  const activeCategory = categories.find((c) => c.slug === cat)
  const activeSubSlug =
    activeCategory?.subcategories.find((s) => s.slug === sub)?.slug ??
    activeCategory?.subcategories[0]?.slug

  return {
    categories,
    categoriesStatus,
    tiles: tilesState.tiles,
    tilesStatus: tilesState.status,
    activeCategory,
    activeSubSlug,
    cat,
    sub,
    hasMore,
    loadingMore,
    loadMore,
  }
}
