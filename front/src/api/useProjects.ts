// Единый источник данных листинга для ОБОИХ деревьев (desktop + mobile).
// Раньше категории/тайлы хардкодились и дублировались между ProjectsScreen.tsx и
// MobileProjects.tsx (front/CLAUDE.md) — теперь оба берут навигацию и тайлы отсюда.
//
// Навигация (категории + подкатегории) грузится один раз; тайлы — по маршруту:
//   `/projects`            → все работы (GET /works)
//   `/projects/:cat/:sub`  → работы подкатегории (GET /categories/:cat/:sub)

import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { getCategories, getSubcategoryListing, getWorks } from './client'
import type { CategoryNav, Tile } from './types'

/** Состояние асинхронной загрузки части данных. */
export type LoadStatus = 'loading' | 'error' | 'ready'

export interface ProjectsData {
  /** Навигация: категории с подкатегориями (для сайдбара/чипов). */
  categories: CategoryNav[]
  categoriesStatus: LoadStatus
  /** Тайлы текущего вида (все работы либо работы подкатегории). */
  tiles: Tile[]
  tilesStatus: LoadStatus
  /** Активная категория (по slug из URL, иначе первая). `undefined`, пока нет категорий. */
  activeCategory: CategoryNav | undefined
  /** Slug активной подкатегории (по URL, иначе первая активной категории). */
  activeSubSlug: string | undefined
  /** Сырые параметры маршрута. */
  cat: string | undefined
  sub: string | undefined
}

export function useProjects(): ProjectsData {
  const { cat, sub } = useParams()

  const [categories, setCategories] = useState<CategoryNav[]>([])
  const [categoriesStatus, setCategoriesStatus] = useState<LoadStatus>('loading')
  const [tiles, setTiles] = useState<Tile[]>([])
  const [tilesStatus, setTilesStatus] = useState<LoadStatus>('loading')

  // Навигация — один раз.
  useEffect(() => {
    let cancelled = false
    setCategoriesStatus('loading')
    getCategories()
      .then((data) => {
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

  // Тайлы — на каждое изменение маршрута.
  useEffect(() => {
    let cancelled = false
    setTilesStatus('loading')
    const load =
      cat && sub
        ? getSubcategoryListing(cat, sub).then((listing) => listing.works)
        : getWorks().then((page) => page.items)
    load
      .then((data) => {
        if (cancelled) return
        setTiles(data)
        setTilesStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setTilesStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [cat, sub])

  const activeCategory = categories.find((c) => c.slug === cat) ?? categories[0]
  const activeSubSlug =
    activeCategory?.subcategories.find((s) => s.slug === sub)?.slug ??
    activeCategory?.subcategories[0]?.slug

  return {
    categories,
    categoriesStatus,
    tiles,
    tilesStatus,
    activeCategory,
    activeSubSlug,
    cat,
    sub,
  }
}
