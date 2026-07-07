import { Link } from 'react-router'
import Masonry from 'react-masonry-css'
import { useProjects } from '../../api/useProjects'
import type { Tile } from '../../api/types'
import { MobileTabBar } from './MobileTabBar'
import styles from './MobileProjects.module.css'

// Высоты скелетон-плейсхолдеров (тон --c-skeleton) на время загрузки тайлов.
const SKELETON_HEIGHTS = [180, 140, 200, 160, 150, 190]

const BREAKPOINT_COLS = { default: 2 }

/** Первые тайлы (первый экран, 2 колонки) — не лениво и с высоким приоритетом (LCP листинга). */
const EAGER_TILES = 4

/** Тайлы из API: aspect-ratio из w/h резервирует место — без скачков layout.
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

export function MobileProjects() {
  const { categories, tiles, tilesStatus, activeCategory, activeSubSlug, cat } = useProjects()
  const allActive = !cat

  return (
    <div className={styles.page} data-test="projects">
      <header className={styles.header} data-test="mobile-header">
        <span className={styles.headerWordmark} data-test="mobile-wordmark">PROKSION</span>
      </header>

      <div className={styles.content} data-test="projects-content">
        <h1 className={styles.title} data-test="projects-title">ПРОЕКТЫ</h1>

        <div className={styles.chips} data-test="projects-chips">
          <Link
            to="/projects"
            className={`${styles.chip}${allActive ? ` ${styles.chipActive}` : ''}`}
            data-test="projects-chip-all"
          >
            ВСЕ
          </Link>
          {categories.map((g) => {
            const isActive = g.id === activeCategory?.id
            return (
              <Link
                key={g.id}
                to={
                  `/projects/${g.slug}` +
                  (g.subcategories[0] ? `/${g.subcategories[0].slug}` : '')
                }
                className={`${styles.chip}${isActive ? ` ${styles.chipActive}` : ''}`}
                data-test="projects-chip"
              >
                {g.title}
              </Link>
            )
          })}
        </div>

        {activeCategory && activeCategory.subcategories.length > 0 && (
          <div className={styles.subTabs} data-test="projects-subtabs">
            {activeCategory.subcategories.map((s) => {
              const isActive = s.slug === activeSubSlug
              return (
                <Link
                  key={s.id}
                  to={`/projects/${activeCategory.slug}/${s.slug}`}
                  className={`${styles.subTab}${isActive ? ` ${styles.subTabActive}` : ''}`}
                  data-test="projects-subtab"
                >
                  <span
                    className={`${styles.subTabLabel}${
                      isActive ? ` ${styles.subTabLabelActive}` : ''
                    }`}
                  >
                    {s.title}
                  </span>
                </Link>
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
          {tilesStatus === 'ready' && tiles.length > 0 && <TileGrid tiles={tiles} />}
        </div>
      </div>

      <MobileTabBar active="projects" />
    </div>
  )
}
