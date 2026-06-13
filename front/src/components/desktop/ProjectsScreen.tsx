import { useParams, useNavigate } from 'react-router'
import type { CSSProperties, ReactNode } from 'react'
import markerPixel from '../../assets/icon-marker-pixel.svg'
import projectSuccess from '../../assets/project-success.png'
import projectPost from '../../assets/project-post.png'
import layout from '../../styles/layout.module.css'
import styles from './ProjectsScreen.module.css'

interface Group {
  id: string
  slug: string
  label: string
  children: { id: string; slug: string; label: string }[]
}

const GROUPS: Group[] = [
  {
    id: 'pressf',
    slug: 'press-f',
    label: 'Press F',
    children: [
      { id: 'banners', slug: 'bannery', label: 'Баннера' },
      { id: 'vitriny', slug: 'vitriny', label: 'Витрины товаров' },
      { id: 'posts', slug: 'posty', label: 'Посты в соц.сети' },
    ],
  },
  {
    id: 'kupikod',
    slug: 'kupikod',
    label: 'KUPIKOD',
    children: [
      { id: 'k-banners', slug: 'bannery', label: 'Баннера' },
      { id: 'k-yt', slug: 'youtube', label: 'YouTube обложки' },
      { id: 'k-posts1', slug: 'posty', label: 'Посты в соц.сети' },
    ],
  },
  {
    id: 'drawing',
    slug: 'risovanie',
    label: 'Рисование',
    children: [
      { id: 'd-painting', slug: 'zhivopis', label: 'Живопись' },
      { id: 'd-drawing', slug: 'risunok', label: 'Рисунок' },
      { id: 'd-digital', slug: 'digital', label: 'Диджитал арт' },
    ],
  },
  { id: 'sketchbook', slug: 'sketchbook', label: 'Sketchbook', children: [] },
  { id: 'uiux', slug: 'uiux', label: 'UI/UX кейсы', children: [] },
]

// Pinterest-style masonry tiles. Real projects use imagery; the rest are
// tonal placeholders that read as future cases.
const TILES: { h: number; fill?: string; image?: string }[] = [
  { h: 320, fill: '#d9d9d9' },
  { h: 240, fill: '#bfbfbf' },
  { h: 420, image: projectSuccess },
  { h: 280, fill: '#e4e4e4' },
  { h: 200, fill: '#c4c4c4' },
  { h: 360, fill: '#d9d9d9' },
  { h: 320, image: projectPost },
  { h: 180, fill: '#bfbfbf' },
  { h: 440, fill: '#e4e4e4' },
  { h: 260, fill: '#d9d9d9' },
  { h: 320, fill: '#c4c4c4' },
  { h: 220, fill: '#bfbfbf' },
  { h: 380, fill: '#d9d9d9' },
  { h: 200, fill: '#e4e4e4' },
  { h: 300, fill: '#c4c4c4' },
  { h: 240, fill: '#d9d9d9' },
]

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
    <div className={styles.group}>
      <button
        type="button"
        onClick={onClickGroup}
        className={`${styles.groupHead}${active ? ` ${styles.groupHeadActive}` : ''}`}
      >
        {active && <img className={styles.groupMarker} src={markerPixel} alt="" />}
        {title}
      </button>
      {active && <div className={styles.children}>{children}</div>}
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
    >
      {label}
    </button>
  )
}

export function ProjectsScreen() {
  const { cat, sub } = useParams()
  const navigate = useNavigate()

  const activeGroup = GROUPS.find((g) => g.slug === cat) ?? GROUPS[0]
  const activeChildId = activeGroup.children.find((c) => c.slug === sub)?.id
    ?? activeGroup.children[0]?.id
    ?? null

  return (
    <section className={styles.section} data-screen-label="03 Projects">
      <div className={`${layout.page} ${styles.grid}`}>
        <div>
          {GROUPS.map((g) => (
            <SidebarGroup
              key={g.id}
              title={g.label}
              active={activeGroup.id === g.id}
              onClickGroup={() =>
                navigate(`/projects/${g.slug}` + (g.children[0] ? `/${g.children[0].slug}` : ''))
              }
            >
              {g.children.map((c) => (
                <SidebarChild
                  key={c.id}
                  label={c.label}
                  active={activeGroup.id === g.id && activeChildId === c.id}
                  onClick={() => navigate(`/projects/${g.slug}/${c.slug}`)}
                />
              ))}
            </SidebarGroup>
          ))}
        </div>

        <div className={styles.masonry}>
          {TILES.map((t, i) => {
            const style: CSSProperties = t.image
              ? { height: t.h, backgroundImage: `url(${t.image})` }
              : { height: t.h, background: t.fill }
            return <div key={i} className={styles.tile} tabIndex={0} style={style} />
          })}
        </div>
      </div>
    </section>
  )
}
