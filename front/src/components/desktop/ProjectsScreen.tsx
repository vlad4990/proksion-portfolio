// Корневая /projects — десктоп (дизайн: фрейм tVnqG, спека docs/projects-redesign.md §2.1).
// Обзор разделов, а не общий листинг: hero со статами → чипы-теги (`?tag=`) → секции
// категорий с кураторскими витринами трёх вариантов → футер.
//
// Витрина секции приходит из GET /featured (кураторский список либо fallback), голова —
// из GET /categories. При активном теге витрина каждой секции заменяется masonry-гридом
// работ категории с этим тегом; секции без совпадений исчезают.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import Masonry from 'react-masonry-css'
import { useCategories } from '../../api/useCategories'
import { findSection, useFeatured } from '../../api/useFeatured'
import { useInfiniteWorks } from '../../api/useInfiniteWorks'
import { useTags } from '../../api/useTags'
import type { CategoryNav, FeaturedSection, FeaturedWork, Tile } from '../../api/types'
import { CountBadge } from '../shared/CountBadge'
import { FilterChip } from '../shared/FilterChip'
import { formatSectionsCount } from '../../lib/format'
import { categoryHref, tagHref, workHref } from '../../lib/links'
import { smoothScrollTo } from '../../lib/scroll'
import { cardWorks, splitShowcase, stripWorks } from '../../lib/showcase'
import { ProjectsFooter } from './ProjectsFooter'
import layout from '../../styles/layout.module.css'
import styles from './ProjectsScreen.module.css'

// Тексты hero — константы экрана (в БД их нет; дизайн-фрейм tVnqG).
const HERO_OVERLINE = '// ПОРТФОЛИО — ГРАФИЧЕСКИЙ ДИЗАЙНЕР'
const HERO_TITLE = 'ПРОЕКТЫ'
const HERO_SUBTITLE =
  'Промо-графика для игровых брендов: соцсети, YouTube-обложки, баннеры и UI. ' +
  'Ниже — избранные работы по каждому проекту, полные архивы открываются внутри разделов.'
/** Третий стат — константа (в данных стажа нет). */
const STAT_YEARS = { value: '3 ГОДА', label: 'В КОММЕРЧЕСКОМ ДИЗАЙНЕ' }

const ALL_CHIP_LABEL = 'ВСЕ'
const ALL_WORKS_LINK = 'ВСЕ РАБОТЫ ↗'
const CASE_LINK = 'СМОТРЕТЬ КЕЙС ↗'

/** Колонки masonry тег-режима — те же тиры, что у листинга категории. */
const BREAKPOINT_COLS = { default: 4, 1399: 3, 1099: 2 }
/** Порция работ секции в тег-режиме (пагинации тут нет — дальше «ВСЕ РАБОТЫ ↗»). */
const TAG_LIMIT = 24
/** Первые тайлы первой секции — LCP страницы: eager + высокий приоритет. */
const EAGER_TILES = 8
/** Высоты скелетон-плейсхолдеров masonry (тон --c-skeleton) — без скачков. */
const SKELETON_HEIGHTS = [320, 240, 300, 200, 360, 260, 220, 340]

/** Номер секции в дизайне — с ведущим нулём: 01, 02, … */
const sectionNum = (index: number): string => String(index + 1).padStart(2, '0')

// ── Тайлы витрины ──────────────────────────────────────────────────────────────

interface SlotProps {
  work: FeaturedWork | Tile
  /** Класс слота (ширина/высота в раскладке ряда). */
  className?: string
  /** LCP: первые тайлы первой секции грузим не лениво. */
  eager?: boolean
  /** Пилюля-подпись внизу слева (hero-слот витрины) — заголовок работы. */
  caption?: boolean
}

/**
 * Слот витрины: настоящая ссылка на канонический URL работы. Слот повторяет пропорции
 * картинки (`aspect-ratio` из w/h), а `--ar` (= w/h) отдаёт flex-grow ряда — в выровненном
 * ряду ширина тайла пропорциональна его пропорциям, картинка видна целиком, без обрезки.
 */
function Slot({ work, className, eager = false, caption = false }: SlotProps) {
  const ratio = {
    aspectRatio: `${work.w} / ${work.h}`,
    '--ar': String(work.w / work.h),
  } as CSSProperties
  return (
    <Link
      to={workHref(work)}
      className={`${styles.slot}${className ? ` ${className}` : ''}`}
      style={ratio}
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

/** Пустой слот-заглушка (тон --c-skeleton) — пока витрина грузится. */
function SlotSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`${styles.slot}${className ? ` ${className}` : ''}`}
      data-test="showcase-slot-skeleton"
      aria-hidden="true"
    />
  )
}

// ── Витрины трёх вариантов ─────────────────────────────────────────────────────

/** `showcase`: выровненные ряды — ряд A (hero с подписью + до 2 работ) и ряд B (до 4). */
function ShowcaseGrid({ works, eager }: { works: FeaturedWork[]; eager: boolean }) {
  const { hero, side, rowB } = splitShowcase(works)
  if (!hero) return null
  return (
    <div className={styles.showcase} data-test="showcase-showcase">
      <div className={styles.rowA}>
        <Slot work={hero} eager={eager} caption />
        {side.map((w) => (
          <Slot key={w.id} work={w} eager={eager} />
        ))}
      </div>
      {rowB.length > 0 && (
        <div className={styles.rowB}>
          {rowB.map((w) => (
            <Slot key={w.id} work={w} />
          ))}
        </div>
      )}
    </div>
  )
}

/** `strip`: один выровненный ряд — до 4 работ, при 5+ ряд плотнее (и потому ниже). */
function StripGrid({ works, eager }: { works: FeaturedWork[]; eager: boolean }) {
  const list = stripWorks(works)
  if (list.length === 0) return null
  return (
    <div className={styles.strip} data-test="showcase-strip">
      {list.map((w, i) => (
        <Slot key={w.id} work={w} eager={eager && i < 4} />
      ))}
    </div>
  )
}

/** `cards`: карточки с превью, описанием работы и ссылкой в модалку кейса. */
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
          <Slot work={w} className={styles.cardPreview} eager={eager && i < 2} />
          <div className={styles.cardText}>
            {w.title && <h3 className={styles.cardTitle}>{w.title}</h3>}
            {w.description && <p className={styles.cardDesc}>{w.description}</p>}
            <div className={styles.cardMeta}>
              <span className={styles.meta}>{meta.join(' · ')}</span>
              <Link to={workHref(w)} className={styles.cardLink}>
                {CASE_LINK}
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

/** Витрина по варианту категории. */
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

// ── Головы секций ──────────────────────────────────────────────────────────────

function TitleLine({ category, index }: { category: CategoryNav; index: number }) {
  return (
    <div className={styles.titleLine}>
      <span className={styles.num}>{sectionNum(index)}</span>
      <h2 className={styles.caseTitle}>{category.title}</h2>
      <CountBadge count={category.work_count} testId="section-count" />
    </div>
  )
}

/** Полная голова (`showcase`): титул + описание слева, мета и «ВСЕ РАБОТЫ ↗» справа. */
function FullHead({ category, index }: { category: CategoryNav; index: number }) {
  return (
    <div className={styles.head}>
      <div className={styles.headLeft}>
        <TitleLine category={category} index={index} />
        {category.description && <p className={styles.caseDesc}>{category.description}</p>}
      </div>
      <div className={styles.headRight}>
        {category.meta_role && <span className={styles.meta}>{category.meta_role}</span>}
        {category.period && <span className={styles.meta}>{category.period}</span>}
        <Link to={categoryHref(category.slug)} className={styles.allLink} data-test="section-all">
          {ALL_WORKS_LINK}
        </Link>
      </div>
    </div>
  )
}

/** Лёгкая голова (`strip`/`cards`): титул слева, однострочное описание и ссылка справа. */
function LightHead({ category, index }: { category: CategoryNav; index: number }) {
  return (
    <div className={styles.headLight}>
      <TitleLine category={category} index={index} />
      <div className={styles.lightRight}>
        {category.description && <span className={styles.meta}>{category.description}</span>}
        <Link to={categoryHref(category.slug)} className={styles.allLink} data-test="section-all">
          {ALL_WORKS_LINK}
        </Link>
      </div>
    </div>
  )
}

function SectionHead({ category, index }: { category: CategoryNav; index: number }) {
  return category.display_variant === 'showcase' ? (
    <FullHead category={category} index={index} />
  ) : (
    <LightHead category={category} index={index} />
  )
}

// ── Секции ─────────────────────────────────────────────────────────────────────

/** Обёртка секции: hairline сверху, гаттеры страницы, ref для скролла к первой. */
function SectionShell({
  innerRef,
  children,
}: {
  innerRef?: ((node: HTMLElement | null) => void) | undefined
  children: ReactNode
}) {
  return (
    <section className={styles.section} ref={innerRef} data-test="projects-section">
      <div className={`${layout.page} ${styles.sectionInner}`}>{children}</div>
    </section>
  )
}

/** Скелетон секции на холодной загрузке категорий: голова-плейсхолдер + слоты витрины. */
function SectionSkeleton() {
  return (
    <SectionShell>
      <div className={styles.headSkeleton} aria-hidden="true">
        <span className={styles.lineSkeleton} />
        <span className={`${styles.lineSkeleton} ${styles.lineSkeletonWide}`} />
      </div>
      <div className={styles.showcase}>
        <div className={styles.rowA}>
          <SlotSkeleton className={styles.skelHero} />
          <SlotSkeleton className={styles.skelTall} />
          <SlotSkeleton className={styles.skelSquare} />
        </div>
      </div>
    </SectionShell>
  )
}

/** Секция в обычном режиме: голова + кураторская витрина (или её скелетон). */
function FeaturedCategorySection({
  category,
  index,
  section,
  featuredLoading,
  innerRef,
}: {
  category: CategoryNav
  index: number
  section: FeaturedSection | undefined
  featuredLoading: boolean
  innerRef?: ((node: HTMLElement | null) => void) | undefined
}) {
  return (
    <SectionShell innerRef={innerRef}>
      <SectionHead category={category} index={index} />
      {featuredLoading ? (
        <div className={styles.showcase}>
          <div className={styles.rowA}>
            <SlotSkeleton className={styles.skelHero} />
            <SlotSkeleton className={styles.skelTall} />
            <SlotSkeleton className={styles.skelSquare} />
          </div>
        </div>
      ) : (
        <Showcase category={category} section={section} eager={index === 0} />
      )}
    </SectionShell>
  )
}

/** Секция в тег-режиме: работы категории с выбранным тегом (masonry); пустая — скрыта. */
function TaggedCategorySection({
  category,
  index,
  tag,
  report,
  innerRef,
}: {
  category: CategoryNav
  index: number
  tag: string
  report: (key: string, count: number) => void
  innerRef?: ((node: HTMLElement | null) => void) | undefined
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
      <SectionShell innerRef={innerRef}>
        <SectionHead category={category} index={index} />
        <TileSkeleton />
      </SectionShell>
    )
  }
  if (status === 'error') {
    return (
      <SectionShell innerRef={innerRef}>
        <SectionHead category={category} index={index} />
        <p className={styles.message} data-test="projects-error">
          Не удалось загрузить работы раздела. Обновите страницу.
        </p>
      </SectionShell>
    )
  }
  if (tiles.length === 0) return null

  return (
    <SectionShell innerRef={innerRef}>
      <SectionHead category={category} index={index} />
      <TileGrid tiles={tiles} eager={index === 0} />
    </SectionShell>
  )
}

/** Masonry-грид работ (тег-режим) — тот же паттерн, что на странице категории. */
function TileGrid({ tiles, eager }: { tiles: Tile[]; eager: boolean }) {
  return (
    <div data-test="projects-tiles">
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

/** Скелетон masonry-грида: плейсхолдеры тона --c-skeleton в той же раскладке. */
function TileSkeleton() {
  return (
    <div data-test="projects-tiles">
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

// ── Экран ──────────────────────────────────────────────────────────────────────

export function ProjectsScreen() {
  const [searchParams] = useSearchParams()
  const tag = searchParams.get('tag') ?? undefined

  const { categories, status: categoriesStatus } = useCategories()
  const { sections, status: featuredStatus } = useFeatured()
  const { tags } = useTags()

  // Сколько работ с тегом нашла каждая секция (ключ — `тег:категория`, -1 = ошибка).
  // Нужно только для состояния «по тегу ничего нет»: сами секции скрываются сами.
  const [matches, setMatches] = useState<Record<string, number>>({})
  const report = useCallback((key: string, count: number) => {
    setMatches((prev) => (prev[key] === count ? prev : { ...prev, [key]: count }))
  }, [])

  const firstSection = useRef<HTMLElement | null>(null)
  const setFirstSection = useCallback((node: HTMLElement | null) => {
    firstSection.current = node
  }, [])

  // «NN РАЗДЕЛОВ ↓» — плавный скролл к первой секции (учитываем фиксированную шапку).
  const scrollToSections = useCallback(() => {
    const node = firstSection.current
    if (!node) return
    const navH = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-h'),
    )
    const offset = Number.isFinite(navH) ? navH : 0
    smoothScrollTo(node.getBoundingClientRect().top + window.scrollY - offset)
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
    <section className={styles.screen} data-screen-label="03 Projects" data-test="projects">
      <div className={`${layout.page} ${styles.hero}`} data-test="projects-hero">
        <div className={styles.heroTop}>
          <div className={styles.heroLeft}>
            <span className={styles.overline}>{HERO_OVERLINE}</span>
            <div className={styles.titleRow}>
              <h1 className={styles.title} data-test="projects-title">
                {HERO_TITLE}
              </h1>
              <span className={styles.square} aria-hidden="true" />
            </div>
            <p className={styles.subtitle}>{HERO_SUBTITLE}</p>
          </div>

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
          <div className={styles.filters}>
            <div className={styles.chipRow} data-test="projects-chips">
              <FilterChip
                label={ALL_CHIP_LABEL}
                count={totalWorks}
                to={tagHref()}
                active={tag === undefined}
                testId="projects-chip-all"
              />
              {tags.map((t) => (
                <FilterChip
                  key={t.id}
                  label={t.title.toUpperCase()}
                  count={t.work_count}
                  to={tagHref(t.slug)}
                  active={tag === t.slug}
                  testId="projects-chip"
                />
              ))}
            </div>
            <button
              type="button"
              className={styles.sectionsHint}
              onClick={scrollToSections}
              data-test="projects-sections-hint"
            >
              {formatSectionsCount(categories.length)} ↓
            </button>
          </div>
        )}
      </div>

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
        categories.map((category, index) => {
          const innerRef = index === 0 ? setFirstSection : undefined
          return tag === undefined ? (
            <FeaturedCategorySection
              key={category.id}
              category={category}
              index={index}
              section={findSection(sections, category.slug)}
              featuredLoading={featuredStatus === 'loading'}
              innerRef={innerRef}
            />
          ) : (
            <TaggedCategorySection
              key={category.id}
              category={category}
              index={index}
              tag={tag}
              report={report}
              innerRef={innerRef}
            />
          )
        })}

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
    </section>
  )
}
