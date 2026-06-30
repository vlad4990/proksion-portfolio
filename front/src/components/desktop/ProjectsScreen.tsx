import { useParams, useNavigate } from 'react-router'
import type { ReactNode } from 'react'
import Masonry from 'react-masonry-css'
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

// Тайл masonry. Будущая форма проекта из CDN — достаточно { id, src } (только URL):
// высота берётся из самой картинки (height:auto), заранее её знать не нужно. Опциональные
// натуральные размеры w/h — если CDN их отдаёт: тогда резервируем место через aspect-ratio
// и при загрузке нет скачков layout. Остальное — тональные заглушки с фиксированной высотой
// (пока реальных проектов нет).
type Tile =
  | { id: string; src: string; w?: number; h?: number }
  | { id: string; fill: string; ph: number }

const TILES: Tile[] = [
  { id: 't1', fill: '#d9d9d9', ph: 320 },
  { id: 't2', fill: '#bfbfbf', ph: 240 },
  { id: 't3', src: projectSuccess },
  { id: 't4', fill: '#e4e4e4', ph: 280 },
  { id: 't5', fill: '#c4c4c4', ph: 200 },
  { id: 't6', fill: '#d9d9d9', ph: 360 },
  { id: 't7', src: projectPost },
  { id: 't8', fill: '#bfbfbf', ph: 180 },
  { id: 't9', fill: '#e4e4e4', ph: 440 },
  { id: 't10', fill: '#d9d9d9', ph: 260 },
  { id: 't11', fill: '#c4c4c4', ph: 320 },
  { id: 't12', fill: '#bfbfbf', ph: 220 },
  { id: 't13', fill: '#d9d9d9', ph: 380 },
  { id: 't14', fill: '#e4e4e4', ph: 200 },
  { id: 't15', fill: '#c4c4c4', ph: 300 },
  { id: 't16', fill: '#d9d9d9', ph: 240 },
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

export function ProjectsScreen() {
  const { cat, sub } = useParams()
  const navigate = useNavigate()

  const activeGroup = GROUPS.find((g) => g.slug === cat) ?? GROUPS[0]
  const activeChildId = activeGroup.children.find((c) => c.slug === sub)?.id
    ?? activeGroup.children[0]?.id
    ?? null

  return (
    <section className={styles.section} data-screen-label="03 Projects" data-test="projects">
      <div className={`${layout.page} ${styles.grid}`}>
        <div data-test="projects-sidebar">
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

        <div data-test="projects-tiles">
          <Masonry
            breakpointCols={{ default: 4, 1399: 3, 1099: 2 }}
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
                  tabIndex={0}
                  style={t.w && t.h ? { aspectRatio: `${t.w} / ${t.h}` } : undefined}
                  data-test="projects-tile"
                />
              ) : (
                <div
                  key={t.id}
                  className={styles.tile}
                  tabIndex={0}
                  style={{ height: t.ph, background: t.fill }}
                  data-test="projects-tile"
                />
              ),
            )}
          </Masonry>
        </div>
      </div>
    </section>
  )
}
