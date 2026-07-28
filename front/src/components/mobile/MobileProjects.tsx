// Корневая /projects — мобайл (дизайн: фрейм N8NrSi, спека docs/projects-redesign.md §2.2).
// Функционально то же, что десктопный ProjectsScreen: hero со статами → горизонтальный ряд
// чипов-тегов (`?tag=`) → секции категорий с витринами трёх вариантов → футер.
// Mobile Header / Status Bar из фрейма не делаем — остаётся текущий фиксированный
// мини-хедер экрана и общий MobileTabBar.

import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import Masonry from 'react-masonry-css'
import { useCategories } from '../../api/useCategories'
import { findSection, useFeatured } from '../../api/useFeatured'
import { useInfiniteWorks } from '../../api/useInfiniteWorks'
import { useTags } from '../../api/useTags'
import type { CategoryNav, FeaturedSection, FeaturedWork, Tile } from '../../api/types'
import { CountBadge } from '../shared/CountBadge'
import { FilterChip } from '../shared/FilterChip'
import { categoryHref, tagHref, workHref } from '../../lib/links'
import { cardWorks, chunk, isDenseStrip, splitShowcase, stripWorks } from '../../lib/showcase'
import { MobileTabBar } from './MobileTabBar'
import { ProjectsFooter } from './ProjectsFooter'
import styles from './MobileProjects.module.css'

// Тексты hero — константы экрана (дизайн-фрейм N8NrSi; мобильный подзаголовок короче).
const HERO_OVERLINE = '// ПОРТФОЛИО — ГРАФИЧЕСКИЙ ДИЗАЙНЕР'
const HERO_TITLE = 'ПРОЕКТЫ'
const HERO_SUBTITLE =
  'Промо-графика для игровых брендов: соцсети, YouTube-обложки, баннеры и UI. ' +
  'Полные архивы — внутри разделов.'
const STAT_YEARS = { value: '3 ГОДА', label: 'В КОММЕРЧЕСКОМ ДИЗАЙНЕ' }

const ALL_CHIP_LABEL = 'ВСЕ'
const ALL_WORKS_LINK = 'ВСЕ РАБОТЫ ↗'
const CASE_LINK = 'СМОТРЕТЬ КЕЙС ↗'

const BREAKPOINT_COLS = { default: 2 }
/** Порция работ секции в тег-режиме. */
const TAG_LIMIT = 24
/** Первые тайлы первой секции — LCP страницы (2 колонки → первый экран). */
const EAGER_TILES = 4
const SKELETON_HEIGHTS = [180, 140, 200, 160, 150, 190]

const sectionNum = (index: number): string => String(index + 1).padStart(2, '0')

/** Мета-строка секции: роль · период (showcase) либо однострочное описание (strip/cards). */
function metaLine(category: CategoryNav): string | null {
  const parts = [category.meta_role, category.period].filter((p): p is string => Boolean(p))
  const joined = parts.length > 0 ? parts.join(' · ') : null
  return category.display_variant === 'showcase' ? joined : (category.description ?? joined)
}

// ── Тайлы витрины ──────────────────────────────────────────────────────────────

interface SlotProps {
  work: FeaturedWork | Tile
  className?: string
  eager?: boolean
  caption?: boolean
}

/** Слот витрины: ссылка на канонический URL работы, картинка обрезается под слот. */
function Slot({ work, className, eager = false, caption = false }: SlotProps) {
  return (
    <Link
      to={workHref(work)}
      className={`${styles.slot}${className ? ` ${className}` : ''}`}
      aria-label={work.title ?? 'Открыть работу'}
      data-test="showcase-slot"
    >
      <picture className={styles.slotPicture}>
        <source type="image/avif" srcSet={work.variants.avif} />
        <source type="image/webp" srcSet={work.variants.webp} />
        <img
          src={work.variants.jpg}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className={styles.slotImg}
          {...(eager ? { fetchpriority: 'high' } : {})}
        />
      </picture>
      {caption && work.title && (
        <span className={styles.caption} data-test="showcase-caption">
          {work.title}
        </span>
      )}
    </Link>
  )
}

function SlotSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`${styles.slot}${className ? ` ${className}` : ''}`}
      data-test="showcase-slot-skeleton"
      aria-hidden="true"
    />
  )
}

/** `showcase`: hero-тайл во всю ширину + пары тайлов. */
function ShowcaseGrid({ works, eager }: { works: FeaturedWork[]; eager: boolean }) {
  const { hero, side, rowB } = splitShowcase(works)
  if (!hero) return null
  const pairs = chunk([...side, ...rowB], 2)
  return (
    <div className={styles.showcase} data-test="showcase-showcase">
      <Slot work={hero} className={styles.heroSlot} eager={eager} caption />
      {pairs.map((row, i) => (
        <div key={i} className={styles.pairRow}>
          {row.map((w) => (
            <Slot key={w.id} work={w} className={styles.pairSlot} eager={eager && i === 0} />
          ))}
        </div>
      ))}
    </div>
  )
}

/** `strip`: пары тайлов (до 4 работ) либо один ряд низких тайлов (5+). */
function StripGrid({ works, eager }: { works: FeaturedWork[]; eager: boolean }) {
  const list = stripWorks(works)
  if (list.length === 0) return null
  if (isDenseStrip(works.length)) {
    return (
      <div className={styles.stripRow} data-test="showcase-strip">
        {list.slice(0, 3).map((w) => (
          <Slot key={w.id} work={w} className={styles.stripSlot} eager={eager} />
        ))}
      </div>
    )
  }
  return (
    <div className={styles.showcase} data-test="showcase-strip">
      {chunk(list, 2).map((row, i) => (
        <div key={i} className={styles.pairRow}>
          {row.map((w) => (
            <Slot key={w.id} work={w} className={styles.artSlot} eager={eager && i === 0} />
          ))}
        </div>
      ))}
    </div>
  )
}

/** `cards`: карточки в столбик — превью, заголовок, описание работы, ссылка в модалку. */
function CardsGrid({
  category,
  works,
  eager,
}: {
  category: CategoryNav
  works: FeaturedWork[]
  eager: boolean
}) {
  const list = cardWorks(works)
  if (list.length === 0) return null
  // Мета карточки — роль и годы раздела («UI/UX · 2025» в дизайне).
  const meta = [category.meta_role, category.period].filter((p): p is string => Boolean(p))
  return (
    <div className={styles.cards} data-test="showcase-cards">
      {list.map((w, i) => (
        <article key={w.id} className={styles.card}>
          <Slot work={w} className={styles.cardPreview} eager={eager && i === 0} />
          <div className={styles.cardText}>
            {w.title && <h3 className={styles.cardTitle}>{w.title}</h3>}
            {w.description && <p className={styles.cardDesc}>{w.description}</p>}
            <div className={styles.cardMeta}>
              <span className={styles.meta}>{meta.join(' · ')}</span>
              <Link to={workHref(w)} className={styles.allLink}>
                {CASE_LINK}
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function Showcase({
  category,
  section,
  eager,
}: {
  category: CategoryNav
  section: FeaturedSection | undefined
  eager: boolean
}) {
  const works = section?.works ?? []
  if (works.length === 0) return null
  if (category.display_variant === 'strip') return <StripGrid works={works} eager={eager} />
  if (category.display_variant === 'cards')
    return <CardsGrid category={category} works={works} eager={eager} />
  return <ShowcaseGrid works={works} eager={eager} />
}

// ── Голова и оболочка секции ───────────────────────────────────────────────────

function SectionHead({ category, index }: { category: CategoryNav; index: number }) {
  const meta = metaLine(category)
  return (
    <>
      <div className={styles.titleLine}>
        <span className={styles.num}>{sectionNum(index)}</span>
        <h2 className={styles.caseTitle}>{category.title}</h2>
        <CountBadge count={category.work_count} mobile testId="section-count" />
      </div>
      {category.display_variant === 'showcase' && category.description && (
        <p className={styles.caseDesc}>{category.description}</p>
      )}
      <div className={styles.metaRow}>
        {meta ? <span className={styles.meta}>{meta}</span> : <span />}
        <Link to={categoryHref(category.slug)} className={styles.allLink} data-test="section-all">
          {ALL_WORKS_LINK}
        </Link>
      </div>
    </>
  )
}

function SectionShell({ children }: { children: ReactNode }) {
  return (
    <section className={styles.section} data-test="projects-section">
      {children}
    </section>
  )
}

function FeaturedCategorySection({
  category,
  index,
  section,
  featuredLoading,
}: {
  category: CategoryNav
  index: number
  section: FeaturedSection | undefined
  featuredLoading: boolean
}) {
  return (
    <SectionShell>
      <SectionHead category={category} index={index} />
      {featuredLoading ? (
        <div className={styles.showcase}>
          <SlotSkeleton className={styles.heroSlot} />
          <div className={styles.pairRow}>
            <SlotSkeleton className={styles.pairSlot} />
            <SlotSkeleton className={styles.pairSlot} />
          </div>
        </div>
      ) : (
        <Showcase category={category} section={section} eager={index === 0} />
      )}
    </SectionShell>
  )
}

function TaggedCategorySection({
  category,
  index,
  tag,
  report,
}: {
  category: CategoryNav
  index: number
  tag: string
  report: (key: string, count: number) => void
}) {
  const { tiles, total, status } = useInfiniteWorks({
    cat: category.slug,
    tag,
    limit: TAG_LIMIT,
  })
  const key = `${tag}:${category.slug}`

  useEffect(() => {
    if (status === 'ready') report(key, total)
    if (status === 'error') report(key, -1)
  }, [status, total, key, report])

  if (status === 'loading') {
    return (
      <SectionShell>
        <SectionHead category={category} index={index} />
        <TileSkeleton />
      </SectionShell>
    )
  }
  if (status === 'error') {
    return (
      <SectionShell>
        <SectionHead category={category} index={index} />
        <p className={styles.message} data-test="projects-error">
          Не удалось загрузить работы раздела. Обновите страницу.
        </p>
      </SectionShell>
    )
  }
  if (tiles.length === 0) return null

  return (
    <SectionShell>
      <SectionHead category={category} index={index} />
      <TileGrid tiles={tiles} eager={index === 0} />
    </SectionShell>
  )
}

/** Masonry-грид работ секции в тег-режиме (2 колонки). */
function TileGrid({ tiles, eager }: { tiles: Tile[]; eager: boolean }) {
  return (
    <div className={styles.tiles} data-test="projects-tiles">
      <Masonry
        breakpointCols={BREAKPOINT_COLS}
        className={styles.masonry}
        columnClassName={styles.masonryColumn}
      >
        {tiles.map((t, i) => {
          const isEager = eager && i < EAGER_TILES
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
                  loading={isEager ? 'eager' : 'lazy'}
                  decoding="async"
                  className={styles.tileImg}
                  style={{ aspectRatio: `${t.w} / ${t.h}` }}
                  {...(isEager ? { fetchpriority: 'high' } : {})}
                />
              </picture>
            </Link>
          )
        })}
      </Masonry>
    </div>
  )
}

function TileSkeleton() {
  return (
    <div className={styles.tiles} data-test="projects-tiles">
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
    </div>
  )
}

/** Скелетон секции на холодной загрузке категорий. */
function SectionSkeleton() {
  return (
    <SectionShell>
      <div className={styles.headSkeleton} aria-hidden="true">
        <span className={styles.lineSkeleton} />
        <span className={`${styles.lineSkeleton} ${styles.lineSkeletonWide}`} />
      </div>
      <div className={styles.showcase}>
        <SlotSkeleton className={styles.heroSlot} />
      </div>
    </SectionShell>
  )
}

// ── Экран ──────────────────────────────────────────────────────────────────────

export function MobileProjects() {
  const [searchParams] = useSearchParams()
  const tag = searchParams.get('tag') ?? undefined

  const { categories, status: categoriesStatus } = useCategories()
  const { sections, status: featuredStatus } = useFeatured()
  const { tags } = useTags()

  const [matches, setMatches] = useState<Record<string, number>>({})
  const report = useCallback((key: string, count: number) => {
    setMatches((prev) => (prev[key] === count ? prev : { ...prev, [key]: count }))
  }, [])

  const totalWorks = categories.reduce((sum, c) => sum + c.work_count, 0)
  // Пока категории не пришли, вместо нулей — прочерк (нулевые статы читались бы как факт).
  const statsReady = categoriesStatus === 'ready'
  const tagKeys = categories.map((c) => `${tag}:${c.slug}`)
  const nothingFound =
    tag !== undefined &&
    tagKeys.length > 0 &&
    tagKeys.every((k) => matches[k] !== undefined) &&
    tagKeys.every((k) => matches[k] === 0)

  return (
    <div className={styles.page} data-test="projects">
      <header className={styles.header} data-test="mobile-header">
        <span className={styles.headerWordmark} data-test="mobile-wordmark">PROKSION</span>
      </header>

      <div className={styles.content} data-test="projects-content">
        <div className={styles.hero} data-test="projects-hero">
          <span className={styles.overline}>{HERO_OVERLINE}</span>
          <div className={styles.titleRow}>
            <h1 className={styles.title} data-test="projects-title">
              {HERO_TITLE}
            </h1>
            <span className={styles.square} aria-hidden="true" />
          </div>
          <p className={styles.subtitle}>{HERO_SUBTITLE}</p>

          <div className={styles.heroStats} data-test="projects-stats">
            <div className={styles.stat}>
              <span className={styles.statValue}>{statsReady ? totalWorks : '—'}</span>
              <span className={styles.statLabel}>РАБОТ В АРХИВЕ</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{statsReady ? categories.length : '—'}</span>
              <span className={styles.statLabel}>НАПРАВЛЕНИЙ</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{STAT_YEARS.value}</span>
              <span className={styles.statLabel}>{STAT_YEARS.label}</span>
            </div>
          </div>
        </div>

        {tags.length > 0 && (
          <div className={styles.chips} data-test="projects-chips">
            <FilterChip
              label={ALL_CHIP_LABEL}
              count={totalWorks}
              to={tagHref()}
              active={tag === undefined}
              mobile
              testId="projects-chip-all"
            />
            {tags.map((t) => (
              <FilterChip
                key={t.id}
                label={t.title.toUpperCase()}
                count={t.work_count}
                to={tagHref(t.slug)}
                active={tag === t.slug}
                mobile
                testId="projects-chip"
              />
            ))}
          </div>
        )}

        {categoriesStatus === 'loading' && (
          <>
            <SectionSkeleton />
            <SectionSkeleton />
          </>
        )}

        {categoriesStatus === 'error' && (
          <SectionShell>
            <p className={styles.message} data-test="projects-error">
              Не удалось загрузить разделы. Обновите страницу.
            </p>
          </SectionShell>
        )}

        {categoriesStatus === 'ready' &&
          categories.map((category, index) =>
            tag === undefined ? (
              <FeaturedCategorySection
                key={category.id}
                category={category}
                index={index}
                section={findSection(sections, category.slug)}
                featuredLoading={featuredStatus === 'loading'}
              />
            ) : (
              <TaggedCategorySection
                key={category.id}
                category={category}
                index={index}
                tag={tag}
                report={report}
              />
            ),
          )}

        {nothingFound && (
          <SectionShell>
            <p className={styles.message} data-test="projects-empty">
              По этому тегу работ пока нет.
            </p>
            <Link to={tagHref()} className={styles.allLink} data-test="projects-reset">
              ПОКАЗАТЬ ВСЕ РАБОТЫ ↗
            </Link>
          </SectionShell>
        )}

        <ProjectsFooter />
      </div>

      <MobileTabBar active="projects" />
    </div>
  )
}
