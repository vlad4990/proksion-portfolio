import type { Route } from '../../types'
import layout from '../../styles/layout.module.css'
import styles from './TopNav.module.css'

interface TopNavProps {
  route: Route
  onHome: () => void
  onAbout: () => void
  onProjects: () => void
  onContacts: () => void
}

/** Top bar: PROKSION wordmark (left) → home, centered nav, 2025 (right).
 *  The active item gets the paper-pill treatment. */
export function TopNav({ route, onHome, onAbout, onProjects, onContacts }: TopNavProps) {
  const items = [
    { id: 'about', label: 'ОБО МНЕ', active: route === 'home', onClick: onAbout },
    { id: 'projects', label: 'ПРОЕКТЫ', active: route === 'projects', onClick: onProjects },
    { id: 'contacts', label: 'КОНТАКТЫ', active: route === 'contacts', onClick: onContacts },
  ]

  return (
    <nav className={`${layout.page} ${styles.nav}`}>
      <button type="button" className={styles.wordmark} onClick={onHome}>
        PROKSION
      </button>

      <ul className={styles.list}>
        {items.map((it) => (
          <li key={it.id}>
            <button
              type="button"
              className={`${styles.item}${it.active ? ` ${styles.itemActive}` : ''}`}
              onClick={it.onClick}
            >
              {it.label}
            </button>
          </li>
        ))}
      </ul>

      <span className={styles.year}>2025</span>
    </nav>
  )
}
