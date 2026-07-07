import { useNavigate } from 'react-router'
import type { KeyboardEvent, ReactNode } from 'react'
import Masonry from 'react-masonry-css'
import markerPixel from '../../assets/icon-marker-pixel.svg'
import { useProjects } from '../../api/useProjects'
import { useOpenWork } from '../../hooks/useOpenWork'
import type { CategoryNav, Tile } from '../../api/types'
import layout from '../../styles/layout.module.css'
import styles from './ProjectsScreen.module.css'

// Высоты скелетон-плейсхолдеров (тон --c-skeleton) на время загрузки тайлов — без скачков.
const SKELETON_HEIGHTS = [320, 240, 300, 200, 360, 260, 220, 340, 280, 200, 320, 240]

function SidebarGroup({
  title,
  active,
  onClickGroup,
  children,
}: {
  title: string
  active: boolean
  onClickGroup: () => void
  children: ReactNode
}) {
  return (
    <div className={styles.group} data-test="projects-group">
      <button
        type="button"
        onClick={onClickGroup}
        className={`${styles.groupHead}${active ? ` ${styles.groupHeadActive}` : ''}`}
        data-test="projects-group-head"
      >
        {active && <img className={styles.groupMarker} src={markerPixel} alt="" />}
        {title}
      </button>
      {active && (
        <div className={styles.children} data-test="projects-group-children">
          {children}
        </div>
      )}
    </div>
  )
}

function SidebarChild({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.child}${active ? ` ${styles.childActive}` : ''}`}
      data-test="projects-child"
    >
      {label}
    </button>
  )
}

const BREAKPOINT_COLS = { default: 4, 1399: 3, 1099: 2 }

/** Тайлы из API: место зарезервировано через aspect-ratio (w/h) — нет скачков layout.
 *  Клик/Enter/Space → открыть модалку работы (onOpen с id тайла). */
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

export function ProjectsScreen() {
  const navigate = useNavigate()
  const openWork = useOpenWork()
  const { categories, tiles, tilesStatus, activeCategory, activeSubSlug, cat } = useProjects()
  const allActive = !cat

  const goToGroup = (g: CategoryNav) =>
    navigate(`/projects/${g.slug}` + (g.subcategories[0] ? `/${g.subcategories[0].slug}` : ''))

  return (
    <section className={styles.section} data-screen-label="03 Projects" data-test="projects">
      <div className={`${layout.page} ${styles.grid}`}>
        <div data-test="projects-sidebar">
          <div className={styles.group} data-test="projects-group">
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className={`${styles.groupHead}${allActive ? ` ${styles.groupHeadActive}` : ''}`}
              data-test="projects-all"
            >
              {allActive && <img className={styles.groupMarker} src={markerPixel} alt="" />}
              ВСЕ РАБОТЫ
            </button>
          </div>
          {categories.map((g) => (
            <SidebarGroup
              key={g.id}
              title={g.title}
              active={activeCategory?.id === g.id}
              onClickGroup={() => goToGroup(g)}
            >
              {g.subcategories.map((c) => (
                <SidebarChild
                  key={c.id}
                  label={c.title}
                  active={activeCategory?.id === g.id && activeSubSlug === c.slug}
                  onClick={() => navigate(`/projects/${g.slug}/${c.slug}`)}
                />
              ))}
            </SidebarGroup>
          ))}
        </div>

        <div data-test="projects-tiles">
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
    </section>
  )
}
