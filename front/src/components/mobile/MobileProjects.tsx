import { useNavigate } from 'react-router'
import type { KeyboardEvent } from 'react'
import Masonry from 'react-masonry-css'
import { useProjects } from '../../api/useProjects'
import { useOpenWork } from '../../hooks/useOpenWork'
import type { Tile } from '../../api/types'
import type { Route } from '../../types'
import { MobileTabBar } from './MobileTabBar'
import styles from './MobileProjects.module.css'

// Высоты скелетон-плейсхолдеров (тон --c-skeleton) на время загрузки тайлов.
const SKELETON_HEIGHTS = [180, 140, 200, 160, 150, 190]

const BREAKPOINT_COLS = { default: 2 }

/** Тайлы из API: aspect-ratio из w/h резервирует место — без скачков layout.
 *  Тап/Enter/Space → открыть модалку работы (onOpen с id тайла). */
function TileGrid({ tiles, onOpen }: { tiles: Tile[]; onOpen: (id: number) => void }) {
  const onKey = (e: KeyboardEvent<HTMLImageElement>, id: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen(id)
    }
  }
  return (
    <Masonry
      breakpointCols={BREAKPOINT_COLS}
      className={styles.masonry}
      columnClassName={styles.masonryColumn}
    >
      {tiles.map((t) => (
        <img
          key={t.id}
          src={t.src}
          alt=""
          loading="lazy"
          decoding="async"
          className={styles.tile}
          tabIndex={0}
          role="button"
          aria-label="Открыть работу"
          onClick={() => onOpen(t.id)}
          onKeyDown={(e) => onKey(e, t.id)}
          style={{ aspectRatio: `${t.w} / ${t.h}` }}
          data-test="projects-tile"
        />
      ))}
    </Masonry>
  )
}

/** Скелетон листинга: плейсхолдеры тона --c-skeleton в той же masonry-раскладке. */
function TileSkeleton() {
  return (
    <Masonry
      breakpointCols={BREAKPOINT_COLS}
      className={styles.masonry}
      columnClassName={styles.masonryColumn}
    >
      {SKELETON_HEIGHTS.map((h, i) => (
        <div
          key={i}
          className={styles.tile}
          style={{ height: h }}
          data-test="projects-tile-skeleton"
          aria-hidden="true"
        />
      ))}
    </Masonry>
  )
}

export function MobileProjects({ onNav }: { onNav: (r: Route) => void }) {
  const navigate = useNavigate()
  const openWork = useOpenWork()
  const { categories, tiles, tilesStatus, activeCategory, activeSubSlug } = useProjects()

  return (
    <div className={styles.page} data-test="projects">
      <header className={styles.header} data-test="mobile-header">
        <span className={styles.headerWordmark} data-test="mobile-wordmark">PROKSION</span>
      </header>

      <div className={styles.content} data-test="projects-content">
        <h1 className={styles.title} data-test="projects-title">ПРОЕКТЫ</h1>

        <div className={styles.chips} data-test="projects-chips">
          {categories.map((g) => {
            const isActive = g.id === activeCategory?.id
            return (
              <button
                key={g.id}
                type="button"
                className={`${styles.chip}${isActive ? ` ${styles.chipActive}` : ''}`}
                onClick={() =>
                  navigate(
                    `/projects/${g.slug}` +
                      (g.subcategories[0] ? `/${g.subcategories[0].slug}` : ''),
                  )
                }
                data-test="projects-chip"
              >
                {g.title}
              </button>
            )
          })}
        </div>

        {activeCategory && activeCategory.subcategories.length > 0 && (
          <div className={styles.subTabs} data-test="projects-subtabs">
            {activeCategory.subcategories.map((s) => {
              const isActive = s.slug === activeSubSlug
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`${styles.subTab}${isActive ? ` ${styles.subTabActive}` : ''}`}
                  onClick={() => navigate(`/projects/${activeCategory.slug}/${s.slug}`)}
                  data-test="projects-subtab"
                >
                  <span
                    className={`${styles.subTabLabel}${
                      isActive ? ` ${styles.subTabLabelActive}` : ''
                    }`}
                  >
                    {s.title}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <div className={styles.tiles} data-test="projects-tiles">
          {tilesStatus === 'loading' && <TileSkeleton />}
          {tilesStatus === 'error' && (
            <p className={styles.message} data-test="projects-error">
              Не удалось загрузить работы. Обновите страницу.
            </p>
          )}
          {tilesStatus === 'ready' && tiles.length === 0 && (
            <p className={styles.message} data-test="projects-empty">
              Здесь пока пусто.
            </p>
          )}
          {tilesStatus === 'ready' && tiles.length > 0 && (
            <TileGrid tiles={tiles} onOpen={openWork} />
          )}
        </div>
      </div>

      <MobileTabBar
        active="projects"
        onAbout={() => onNav('home')}
        onProjects={() => onNav('projects')}
        onContacts={() => onNav('contacts')}
      />
    </div>
  )
}
