// Страница категории /projects/:cat[/:sub] — мобайл (дизайн: фрейм fQvBp,
// спека docs/projects-redesign.md §2.4). Крошки → голова категории → горизонтальный
// скролл чипов-табов → счётчик «ПОКАЗАНО N ИЗ M» → masonry 2 колонки с инфинити-скроллом
// → футер. Mobile Header / Status Bar / Tab Bar из фрейма не делаем — текущий хром.
//
// Кнопку «ПОКАЗАТЬ ЕЩЁ» из дизайн-фрейма заменяет сентинел (решение владельца, спека §1.5).

import { useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import Masonry from 'react-masonry-css'
import { useCategory } from '../../api/useCategory'
import { useInfiniteWorks } from '../../api/useInfiniteWorks'
import type { CategoryDetail, Tile } from '../../api/types'
import { CountBadge } from '../shared/CountBadge'
import { FilterChip } from '../shared/FilterChip'
import { categoryHref, subcategoryHref, workHref } from '../../lib/links'
import { ROUTE_TITLES, categoryTitle } from '../../seo'
import { MobileTabBar } from './MobileTabBar'
import { ProjectsFooter } from './ProjectsFooter'
import styles from './MobileCategory.module.css'

const BREAKPOINT_COLS = { default: 2 }
/** Первые тайлы — LCP страницы (2 колонки → первый экран). */
const EAGER_TILES = 4
const SKELETON_HEIGHTS = [180, 140, 200, 160, 150, 190]
/** Скелетоны, дорисовываемые в конец колонок на время догрузки порции. */
const MORE_SKELETON_HEIGHTS = [160, 200]

const ALL_CHIP_LABEL = 'ВСЕ'
const CONTACT_LINK = 'НАПИСАТЬ ПО ПРОЕКТУ ↗'

const sectionNum = (sortOrder: number): string => String(sortOrder + 1).padStart(2, '0')

/** Оверлайн «// РАЗДЕЛ 01 — КОММЕРЧЕСКАЯ ГРАФИКА»; без kicker'а — только номер раздела. */
function overlineText(category: CategoryDetail): string {
  const num = `// РАЗДЕЛ ${sectionNum(category.sort_order)}`
  return category.kicker ? `${num} — ${category.kicker}` : num
}

/** Мета-ряд головы: «SMM · 2023 — 2026» (роль и годы раздела, как в дизайне). */
function metaLine(category: CategoryDetail): string | null {
  const parts = [category.meta_role, category.period].filter((p): p is string => Boolean(p))
  return parts.length > 0 ? parts.join(' · ') : null
}

// ── Крошки ─────────────────────────────────────────────────────────────────────
// «ОБНОВЛЕНО» в мобильном фрейме нет (не влезает в 390px) — только путь.

function Breadcrumbs({ title }: { title: string | null }) {
  return (
    <nav className={styles.crumbs} aria-label="Хлебные крошки" data-test="crumbs">
      <Link to="/" className={styles.crumb}>
        ГЛАВНАЯ
      </Link>
      <span className={styles.sep} aria-hidden="true">
        /
      </span>
      <Link to="/projects" className={styles.crumb}>
        ПРОЕКТЫ
      </Link>
      {title && (
        <>
          <span className={styles.sep} aria-hidden="true">
            /
          </span>
          <span className={styles.crumbCurrent} data-test="crumb-current">
            {title}
          </span>
        </>
      )}
    </nav>
  )
}

// ── Голова категории ───────────────────────────────────────────────────────────

function CategoryHead({ category }: { category: CategoryDetail }) {
  const description = category.description_long ?? category.description
  const meta = metaLine(category)
  return (
    <div className={styles.head} data-test="category-head">
      <span className={styles.overline}>{overlineText(category)}</span>
      <div className={styles.titleRow}>
        <h1 className={styles.title} data-test="category-title">
          {category.title}
        </h1>
        <span className={styles.square} aria-hidden="true" />
        <span className={styles.badgeWrap}>
          <CountBadge count={category.work_count} mobile testId="category-count" />
        </span>
      </div>
      {description && <p className={styles.desc}>{description}</p>}
      <div className={styles.metaRow}>
        {meta ? <span className={styles.meta}>{meta}</span> : <span />}
        <Link to="/contacts" className={styles.contactLink} data-test="category-contact">
          {CONTACT_LINK}
        </Link>
      </div>
    </div>
  )
}

function HeadSkeleton() {
  return (
    <div className={styles.head} aria-hidden="true">
      <span className={styles.lineSkeleton} />
      <span className={`${styles.lineSkeleton} ${styles.lineSkeletonTitle}`} />
      <span className={`${styles.lineSkeleton} ${styles.lineSkeletonWide}`} />
    </div>
  )
}

// ── Masonry-грид ───────────────────────────────────────────────────────────────

function tileSkeleton(height: number, key: string) {
  return (
    <div
      key={key}
      className={styles.tile}
      style={{ height }}
      data-test="projects-tile-skeleton"
      aria-hidden="true"
    />
  )
}

function TileGrid({ tiles, loadingMore }: { tiles: Tile[]; loadingMore: boolean }) {
  return (
    <div className={styles.tiles} data-test="projects-tiles">
      <Masonry
        breakpointCols={BREAKPOINT_COLS}
        className={styles.masonry}
        columnClassName={styles.masonryColumn}
      >
        {[
          ...tiles.map((t, i) => {
            const eager = i < EAGER_TILES
            return (
              <Link
                key={t.id}
                to={workHref(t)}
                className={styles.tile}
                aria-label={t.title ?? 'Открыть работу'}
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
          }),
          ...(loadingMore
            ? MORE_SKELETON_HEIGHTS.map((h, i) => tileSkeleton(h, `more-${i}`))
            : []),
        ]}
      </Masonry>
    </div>
  )
}

function TileGridSkeleton() {
  return (
    <div className={styles.tiles} data-test="projects-tiles">
      <Masonry
        breakpointCols={BREAKPOINT_COLS}
        className={styles.masonry}
        columnClassName={styles.masonryColumn}
      >
        {SKELETON_HEIGHTS.map((h, i) => tileSkeleton(h, `sk-${i}`))}
      </Masonry>
    </div>
  )
}

// ── Экран ──────────────────────────────────────────────────────────────────────

export function MobileCategory() {
  // `work` определён на маршруте модалки (`/projects/:cat/:sub/:work`) — экран под ней тот же.
  const { cat, sub, work } = useParams()
  const { category, status: catStatus } = useCategory(cat)
  const { tiles, total, status, hasMore, loadingMore, sentinelRef } = useInfiniteWorks({
    cat,
    sub,
  })

  const subs = category?.subcategories ?? []
  const unknownSub =
    catStatus === 'ready' && sub !== undefined && !subs.some((s) => s.slug === sub)
  const missing = catStatus === 'notfound' || unknownSub

  // Заголовок вкладки — «KUPIKOD — PROKSION» (подробнее — в десктопном CategoryScreen).
  useEffect(() => {
    if (!category || work !== undefined) return
    document.title = categoryTitle(category.title)
    return () => {
      document.title = ROUTE_TITLES.projects
    }
  }, [category, work])

  if (missing) return <Navigate to="/projects" replace />

  return (
    <div className={styles.page} data-test="category">
      <header className={styles.header} data-test="mobile-header">
        <span className={styles.headerWordmark} data-test="mobile-wordmark">
          PROKSION
        </span>
      </header>

      <div className={styles.content} data-test="category-content">
        <Breadcrumbs title={category?.title ?? null} />

        {catStatus === 'loading' && <HeadSkeleton />}

        {catStatus === 'error' && (
          <div className={styles.head}>
            <p className={styles.message} data-test="category-error">
              Не удалось загрузить раздел. Обновите страницу.
            </p>
          </div>
        )}

        {category && (
          <>
            <CategoryHead category={category} />

            <div className={styles.chips} data-test="category-tabs">
              <FilterChip
                label={ALL_CHIP_LABEL}
                count={category.work_count}
                to={categoryHref(category.slug)}
                active={sub === undefined}
                mobile
                testId="category-tab-all"
              />
              {subs.map((s) => (
                <FilterChip
                  key={s.id}
                  label={s.title.toUpperCase()}
                  count={s.work_count}
                  to={subcategoryHref(category.slug, s.slug)}
                  active={sub === s.slug}
                  mobile
                  testId="category-tab"
                />
              ))}
            </div>
          </>
        )}

        {status === 'ready' && (
          <div className={styles.shownRow}>
            <span className={styles.shown} data-test="category-shown">
              ПОКАЗАНО {tiles.length} ИЗ {total}
            </span>
          </div>
        )}

        <div className={styles.grid}>
          {status === 'loading' && <TileGridSkeleton />}

          {status === 'error' && (
            <p className={styles.message} data-test="category-works-error">
              Не удалось загрузить работы раздела. Обновите страницу.
            </p>
          )}

          {status === 'ready' &&
            (tiles.length > 0 ? (
              <TileGrid tiles={tiles} loadingMore={loadingMore} />
            ) : (
              <p className={styles.message} data-test="category-empty">
                В этом разделе пока нет работ.
              </p>
            ))}

          {/* Сентинел инфинити-скролла: размонтирован, когда грузить больше нечего. */}
          {hasMore && (
            <div ref={sentinelRef} className={styles.sentinel} data-test="category-sentinel" />
          )}
        </div>

        <ProjectsFooter />
      </div>

      <MobileTabBar active="projects" />
    </div>
  )
}
