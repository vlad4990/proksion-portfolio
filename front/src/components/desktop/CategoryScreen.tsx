// Страница категории /projects/:cat[/:sub] — десктоп (дизайн: фрейм h16xA,
// спека docs/projects-redesign.md §2.3). Крошки с «ОБНОВЛЕНО» → голова категории →
// чипы-табы подкатегорий (состояние живёт в URL) → masonry с инфинити-скроллом и
// счётчиком «ПОКАЗАНО N ИЗ M» → футер. Модалка работы открывается поверх (App.tsx).
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
import { formatUpdated } from '../../lib/format'
import { categoryHref, subcategoryHref, workHref } from '../../lib/links'
import { ROUTE_TITLES, categoryTitle } from '../../seo'
import { ProjectsFooter } from './ProjectsFooter'
import layout from '../../styles/layout.module.css'
import styles from './CategoryScreen.module.css'

/** Колонки masonry — те же тиры, что у токенов (совпадает с тег-режимом корневой). */
const BREAKPOINT_COLS = { default: 4, 1399: 3, 1099: 2 }
/** Первые тайлы — LCP страницы: eager + высокий приоритет. */
const EAGER_TILES = 8
/** Высоты скелетон-плейсхолдеров холодной загрузки (тон --c-skeleton). */
const SKELETON_HEIGHTS = [320, 240, 300, 200, 360, 260, 220, 340]
/** Скелетоны, дорисовываемые в конец колонок на время догрузки порции. */
const MORE_SKELETON_HEIGHTS = [280, 220, 320, 240]

const ALL_CHIP_LABEL = 'ВСЕ'
const CONTACT_LINK = 'НАПИСАТЬ ПО ПРОЕКТУ ↗'

/** Номер раздела в оверлайне — с ведущим нулём (позиция категории: 01, 02, …). */
const sectionNum = (sortOrder: number): string => String(sortOrder + 1).padStart(2, '0')

// ── Крошки ─────────────────────────────────────────────────────────────────────

function Breadcrumbs({ title, updated }: { title: string | null; updated: string | null }) {
  return (
    <div className={styles.crumbsBar}>
      <div className={`${layout.page} ${styles.crumbsInner}`}>
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
        {updated && (
          <span className={styles.updated} data-test="crumbs-updated">
            ОБНОВЛЕНО — {updated}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Голова категории ───────────────────────────────────────────────────────────

/** Оверлайн «// РАЗДЕЛ 01 — КОММЕРЧЕСКАЯ ГРАФИКА»; без kicker'а — только номер раздела. */
function overlineText(category: CategoryDetail): string {
  const num = `// РАЗДЕЛ ${sectionNum(category.sort_order)}`
  return category.kicker ? `${num} — ${category.kicker}` : num
}

function HeadTop({ category }: { category: CategoryDetail }) {
  const description = category.description_long ?? category.description
  return (
    <div className={styles.headTop}>
      <div className={styles.headLeft}>
        <span className={styles.overline}>{overlineText(category)}</span>
        <div className={styles.titleRow}>
          <h1 className={styles.title} data-test="category-title">
            {category.title}
          </h1>
          <span className={styles.square} aria-hidden="true" />
          <span className={styles.badgeWrap}>
            <CountBadge count={category.work_count} testId="category-count" />
          </span>
        </div>
        {description && <p className={styles.desc}>{description}</p>}
      </div>

      <div className={styles.headRight}>
        {category.meta_role && <span className={styles.meta}>{category.meta_role}</span>}
        {category.period && <span className={styles.meta}>{category.period}</span>}
        <Link to="/contacts" className={styles.contactLink} data-test="category-contact">
          {CONTACT_LINK}
        </Link>
      </div>
    </div>
  )
}

/** Скелетон головы на холодной загрузке категории — без белого экрана и скачка. */
function HeadSkeleton() {
  return (
    <div className={`${layout.page} ${styles.head}`} aria-hidden="true">
      <div className={styles.headTop}>
        <div className={styles.headLeft}>
          <span className={styles.lineSkeleton} />
          <span className={`${styles.lineSkeleton} ${styles.lineSkeletonTitle}`} />
          <span className={`${styles.lineSkeleton} ${styles.lineSkeletonWide}`} />
        </div>
      </div>
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

/** Грид работ; `loadingMore` дорисовывает скелетоны в конец колонок на время догрузки. */
function TileGrid({ tiles, loadingMore }: { tiles: Tile[]; loadingMore: boolean }) {
  return (
    <div data-test="projects-tiles">
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

/** Скелетон грида на холодной загрузке порции. */
function TileGridSkeleton() {
  return (
    <div data-test="projects-tiles">
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

export function CategoryScreen() {
  // `work` определён на маршруте модалки (`/projects/:cat/:sub/:work`) — экран под ней тот же.
  const { cat, sub, work } = useParams()
  const { category, status: catStatus } = useCategory(cat)
  const { tiles, total, status, hasMore, loadingMore, sentinelRef } = useInfiniteWorks({
    cat,
    sub,
  })

  const subs = category?.subcategories ?? []
  // Неизвестный слаг подкатегории — такой же «нет такой страницы», как 404 категории.
  const unknownSub =
    catStatus === 'ready' && sub !== undefined && !subs.some((s) => s.slug === sub)
  const missing = catStatus === 'notfound' || unknownSub

  // Заголовок вкладки — «KUPIKOD — PROKSION». Пока открыта работа, заголовок за модалкой
  // (иначе мы бы затирали её название при канонизации легаси-URL); при закрытии `work`
  // становится undefined, cleanup модалки отрабатывает раньше — заголовок раздела вернётся.
  useEffect(() => {
    if (!category || work !== undefined) return
    document.title = categoryTitle(category.title)
    return () => {
      document.title = ROUTE_TITLES.projects
    }
  }, [category, work])

  if (missing) return <Navigate to="/projects" replace />

  return (
    <section className={styles.screen} data-screen-label="04 Category" data-test="category">
      <Breadcrumbs
        title={category?.title ?? null}
        updated={formatUpdated(category?.updated_max)}
      />

      {catStatus === 'loading' && <HeadSkeleton />}

      {catStatus === 'error' && (
        <div className={`${layout.page} ${styles.head}`}>
          <p className={styles.message} data-test="category-error">
            Не удалось загрузить раздел. Обновите страницу.
          </p>
        </div>
      )}

      {category && (
        <div className={`${layout.page} ${styles.head}`} data-test="category-head">
          <HeadTop category={category} />

          <div className={styles.subFilters}>
            <div className={styles.chipRow} data-test="category-tabs">
              <FilterChip
                label={ALL_CHIP_LABEL}
                count={category.work_count}
                to={categoryHref(category.slug)}
                active={sub === undefined}
                testId="category-tab-all"
              />
              {subs.map((s) => (
                <FilterChip
                  key={s.id}
                  label={s.title.toUpperCase()}
                  count={s.work_count}
                  to={subcategoryHref(category.slug, s.slug)}
                  active={sub === s.slug}
                  testId="category-tab"
                />
              ))}
            </div>
            {status === 'ready' && (
              <span className={styles.shown} data-test="category-shown">
                ПОКАЗАНО {tiles.length} ИЗ {total}
              </span>
            )}
          </div>
        </div>
      )}

      <div className={`${layout.page} ${styles.grid}`}>
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
    </section>
  )
}
