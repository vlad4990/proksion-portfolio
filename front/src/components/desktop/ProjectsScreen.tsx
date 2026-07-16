import { Link } from 'react-router'
import type { ReactNode } from 'react'
import Masonry from 'react-masonry-css'
import markerPixel from '../../assets/icon-marker-pixel.svg'
import { useProjects } from '../../api/useProjects'
import type { CategoryNav, Tile } from '../../api/types'
import layout from '../../styles/layout.module.css'
import styles from './ProjectsScreen.module.css'

// Высоты скелетон-плейсхолдеров (тон --c-skeleton) на время загрузки тайлов — без скачков.
const SKELETON_HEIGHTS = [320, 240, 300, 200, 360, 260, 220, 340, 280, 200, 320, 240]

function SidebarGroup({
  title,
  active,
  to,
  children,
}: {
  title: string
  active: boolean
  to: string
  children: ReactNode
}) {
  return (
    <div className={styles.group} data-test="projects-group">
      <Link
        to={to}
        className={`${styles.groupHead}${active ? ` ${styles.groupHeadActive}` : ''}`}
        data-test="projects-group-head"
      >
        {active && <img className={styles.groupMarker} src={markerPixel} alt="" />}
        {title}
      </Link>
      {active && (
        <div className={styles.children} data-test="projects-group-children">
          {children}
        </div>
      )}
    </div>
  )
}

function SidebarChild({ label, active, to }: { label: string; active: boolean; to: string }) {
  return (
    <Link
      to={to}
      className={`${styles.child}${active ? ` ${styles.childActive}` : ''}`}
      data-test="projects-child"
    >
      {label}
    </Link>
  )
}

const BREAKPOINT_COLS = { default: 4, 1399: 3, 1099: 2 }

/** Первые тайлы (примерно два ряда) — не лениво и с высоким приоритетом: это LCP листинга,
 *  ленивая загрузка первого экрана лишь оттягивала появление работ. */
const EAGER_TILES = 8

/** Тайлы из API: место зарезервировано через aspect-ratio (w/h) — нет скачков layout.
 *  Тайл — настоящая ссылка на /projects/:cat/:sub/:id (модалка работы поверх листинга);
 *  картинка — <picture> avif/webp/jpg (thumb-варианты уже отдаёт бэкенд, avif втрое легче). */
function TileGrid({ tiles }: { tiles: Tile[] }) {
  return (
    <Masonry
      breakpointCols={BREAKPOINT_COLS}
      className={styles.masonry}
      columnClassName={styles.masonryColumn}
    >
      {tiles.map((t, i) => {
        const eager = i < EAGER_TILES
        return (
          <Link
            key={t.id}
            to={`/projects/${t.cat}/${t.sub}/${t.id}`}
            className={styles.tile}
            aria-label="Открыть работу"
            data-test="projects-tile"
          >
            <picture className={styles.tilePicture}>
              <source type="image/avif" srcSet={t.variants.avif} />
              <source type="image/webp" srcSet={t.variants.webp} />
              <img
                src={t.variants.jpg}
                alt=""
                loading={eager ? 'eager' : 'lazy'}
                decoding="async"
                className={styles.tileImg}
                style={{ aspectRatio: `${t.w} / ${t.h}` }}
                {...(eager ? { fetchpriority: 'high' } : {})}
              />
            </picture>
          </Link>
        )
      })}
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
  const {
    categories,
    tiles,
    tilesStatus,
    activeCategory,
    activeSubSlug,
    cat,
    hasMore,
    loadingMore,
    loadMore,
  } = useProjects()
  const allActive = !cat

  const groupTo = (g: CategoryNav) =>
    `/projects/${g.slug}` + (g.subcategories[0] ? `/${g.subcategories[0].slug}` : '')

  return (
    <section className={styles.section} data-screen-label="03 Projects" data-test="projects">
      <div className={`${layout.page} ${styles.grid}`}>
        <div data-test="projects-sidebar">
          <div className={styles.group} data-test="projects-group">
            <Link
              to="/projects"
              className={`${styles.groupHead}${allActive ? ` ${styles.groupHeadActive}` : ''}`}
              data-test="projects-all"
            >
              {allActive && <img className={styles.groupMarker} src={markerPixel} alt="" />}
              ВСЕ РАБОТЫ
            </Link>
          </div>
          {categories.map((g) => (
            <SidebarGroup
              key={g.id}
              title={g.title}
              active={activeCategory?.id === g.id}
              to={groupTo(g)}
            >
              {g.subcategories.map((c) => (
                <SidebarChild
                  key={c.id}
                  label={c.title}
                  active={activeCategory?.id === g.id && activeSubSlug === c.slug}
                  to={`/projects/${g.slug}/${c.slug}`}
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
          {tilesStatus === 'ready' && tiles.length > 0 && <TileGrid tiles={tiles} />}
          {hasMore && (
            <button
              type="button"
              className={styles.loadMore}
              onClick={loadMore}
              disabled={loadingMore}
              data-test="projects-load-more"
            >
              {loadingMore ? 'Загружаем…' : 'Показать ещё'}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
