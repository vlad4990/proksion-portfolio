import { Link } from 'react-router'
import type { Route } from '../../types'
import layout from '../../styles/layout.module.css'
import styles from './TopNav.module.css'

interface TopNavProps {
  route: Route
  /** Клик по «ОБО МНЕ»/wordmark, когда пользователь уже на главной — плавный скролл вверх
   *  (сама навигация — обычные ссылки, скролл при смене раздела делает App). */
  onHomeClick: () => void
}

/** Top bar: PROKSION wordmark (left) → home, centered nav, 2025 (right).
 *  The active item gets the paper-pill treatment. Пункты — настоящие <Link>. */
export function TopNav({ route, onHomeClick }: TopNavProps) {
  const items = [
    { id: 'about', label: 'ОБО МНЕ', to: '/', active: route === 'home', onClick: onHomeClick },
    { id: 'projects', label: 'ПРОЕКТЫ', to: '/projects', active: route === 'projects' },
    { id: 'contacts', label: 'КОНТАКТЫ', to: '/contacts', active: route === 'contacts' },
  ]

  return (
    <nav className={`${layout.page} ${styles.nav}`} data-test="top-nav">
      <Link to="/" className={styles.wordmark} onClick={onHomeClick} data-test="nav-wordmark">
        PROKSION
      </Link>

      <ul className={styles.list} data-test="nav-list">
        {items.map((it) => (
          <li key={it.id}>
            <Link
              to={it.to}
              className={`${styles.item}${it.active ? ` ${styles.itemActive}` : ''}`}
              onClick={it.onClick}
              data-test={`nav-${it.id}`}
            >
              {it.label}
            </Link>
          </li>
        ))}
      </ul>

      <span className={styles.year} data-test="nav-year">2025</span>
    </nav>
  )
}
