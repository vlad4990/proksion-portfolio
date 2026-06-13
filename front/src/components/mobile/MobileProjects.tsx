import { useParams, useNavigate } from 'react-router'
import type { CSSProperties } from 'react'
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

const TILES: { h: number; image?: string; color?: string }[] = [
  { image: projectSuccess, h: 240 },
  { color: '#3a3a3a', h: 160 },
  { image: projectPost, h: 200 },
  { color: '#2e2e2e', h: 180 },
  { color: '#444', h: 140 },
  { color: '#383838', h: 200 },
]

export function MobileProjects({ onNav }: { onNav: (r: Route) => void }) {
  const { cat, sub } = useParams()
  const navigate = useNavigate()

  const currentGroup = GROUPS.find((g) => g.slug === cat) ?? GROUPS[0]
  const activeSub = currentGroup.subs.find((s) => s.slug === sub)?.id
    ?? currentGroup.subs[0]?.id
    ?? null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.headerWordmark}>PROKSION</span>
      </header>

      <div className={styles.content}>
        <h1 className={styles.title}>ПРОЕКТЫ</h1>

        <div className={styles.chips}>
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
              >
                {g.label}
              </button>
            )
          })}
        </div>

        {currentGroup.subs.length > 0 && (
          <div className={styles.subTabs}>
            {currentGroup.subs.map((s) => {
              const isActive = s.id === activeSub
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`${styles.subTab}${isActive ? ` ${styles.subTabActive}` : ''}`}
                  onClick={() => navigate(`/projects/${currentGroup.slug}/${s.slug}`)}
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

        <div className={styles.tiles}>
          {TILES.map((t, i) => {
            const style: CSSProperties = t.image
              ? { height: t.h, backgroundImage: `url(${t.image})` }
              : { height: t.h, background: t.color }
            return <div key={i} className={styles.tile} style={style} />
          })}
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
