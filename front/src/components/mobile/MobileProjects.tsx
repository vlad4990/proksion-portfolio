import { useParams, useNavigate } from 'react-router'
import Masonry from 'react-masonry-css'
import projectSuccess from '../../assets/project-success.png'
import projectPost from '../../assets/project-post.png'
import type { Route } from '../../types'
import { MobileTabBar } from './MobileTabBar'
import styles from './MobileProjects.module.css'

interface Group {
  id: string
  slug: string
  label: string
  subs: { id: string; slug: string; label: string }[]
}

const GROUPS: Group[] = [
  {
    id: 'pressf',
    slug: 'press-f',
    label: 'Press F',
    subs: [
      { id: 'banners', slug: 'bannery', label: 'Баннера' },
      { id: 'vitriny', slug: 'vitriny', label: 'Витрины товаров' },
      { id: 'posts', slug: 'posty', label: 'Посты в соц.сети' },
    ],
  },
  {
    id: 'kupikod',
    slug: 'kupikod',
    label: 'KUPIKOD',
    subs: [
      { id: 'k-ban', slug: 'bannery', label: 'Баннера' },
      { id: 'k-yt', slug: 'youtube', label: 'YouTube обложки' },
    ],
  },
  {
    id: 'drawing',
    slug: 'risovanie',
    label: 'Рисование',
    subs: [
      { id: 'd-paint', slug: 'zhivopis', label: 'Живопись' },
      { id: 'd-draw', slug: 'risunok', label: 'Рисунок' },
      { id: 'd-dig', slug: 'digital', label: 'Диджитал арт' },
    ],
  },
  { id: 'sketch', slug: 'sketchbook', label: 'Sketchbook', subs: [] },
  { id: 'uiux', slug: 'uiux', label: 'UI/UX', subs: [] },
]

// Тайл masonry. Будущая форма проекта из CDN — достаточно { id, src } (только URL):
// высота берётся из картинки (height:auto). w/h — опционально, если CDN их отдаёт →
// aspect-ratio резервирует место (нет скачков при загрузке). Остальное — заглушки.
type Tile =
  | { id: string; src: string; w?: number; h?: number }
  | { id: string; color: string; ph: number }

const TILES: Tile[] = [
  { id: 't1', src: projectSuccess, w: 3840, h: 2160 },
  { id: 't2', color: '#3a3a3a', ph: 160 },
  { id: 't3', src: projectPost, w: 3840, h: 2160 },
  { id: 't4', color: '#2e2e2e', ph: 180 },
  { id: 't5', color: '#444', ph: 140 },
  { id: 't6', color: '#383838', ph: 200 },
]

export function MobileProjects({ onNav }: { onNav: (r: Route) => void }) {
  const { cat, sub } = useParams()
  const navigate = useNavigate()

  const currentGroup = GROUPS.find((g) => g.slug === cat) ?? GROUPS[0]
  const activeSub = currentGroup.subs.find((s) => s.slug === sub)?.id
    ?? currentGroup.subs[0]?.id
    ?? null

  return (
    <div className={styles.page} data-test="projects">
      <header className={styles.header} data-test="mobile-header">
        <span className={styles.headerWordmark} data-test="mobile-wordmark">PROKSION</span>
      </header>

      <div className={styles.content} data-test="projects-content">
        <h1 className={styles.title} data-test="projects-title">ПРОЕКТЫ</h1>

        <div className={styles.chips} data-test="projects-chips">
          {GROUPS.map((g) => {
            const isActive = g.id === currentGroup.id
            return (
              <button
                key={g.id}
                type="button"
                className={`${styles.chip}${isActive ? ` ${styles.chipActive}` : ''}`}
                onClick={() =>
                  navigate(`/projects/${g.slug}` + (g.subs[0] ? `/${g.subs[0].slug}` : ''))
                }
                data-test="projects-chip"
              >
                {g.label}
              </button>
            )
          })}
        </div>

        {currentGroup.subs.length > 0 && (
          <div className={styles.subTabs} data-test="projects-subtabs">
            {currentGroup.subs.map((s) => {
              const isActive = s.id === activeSub
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`${styles.subTab}${isActive ? ` ${styles.subTabActive}` : ''}`}
                  onClick={() => navigate(`/projects/${currentGroup.slug}/${s.slug}`)}
                  data-test="projects-subtab"
                >
                  <span
                    className={`${styles.subTabLabel}${
                      isActive ? ` ${styles.subTabLabelActive}` : ''
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <div className={styles.tiles} data-test="projects-tiles">
          <Masonry
            breakpointCols={{ default: 2 }}
            className={styles.masonry}
            columnClassName={styles.masonryColumn}
          >
            {TILES.map((t) =>
              'src' in t ? (
                <img
                  key={t.id}
                  src={t.src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className={styles.tile}
                  style={t.w && t.h ? { aspectRatio: `${t.w} / ${t.h}` } : undefined}
                  data-test="projects-tile"
                />
              ) : (
                <div
                  key={t.id}
                  className={styles.tile}
                  style={{ height: t.ph, background: t.color }}
                  data-test="projects-tile"
                />
              ),
            )}
          </Masonry>
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
