import { Link, useLocation } from 'react-router'
import type { Route } from '../../types'
import { CURRENT_YEAR } from '../../lib/contacts'
import { smoothScrollTo } from '../../lib/scroll'
import layout from '../../styles/layout.module.css'
import styles from './TopNav.module.css'

interface TopNavProps {
  route: Route
}

/** Top bar: PROKSION wordmark (left) → home, centered nav, текущий год (right).
 *  The active item gets the paper-pill treatment. Пункты — настоящие <Link>. */
export function TopNav({ route }: TopNavProps) {
  const { pathname } = useLocation()
  // Клик по пункту, чей URL уже открыт (ссылка — no-op, эффект скролла App не сработает):
  // плавно докручиваем раздел к началу. Иначе навигация меняет scroll-key и App скроллит сам.
  const scrollIfCurrent = (to: string) => () => {
    if (pathname === to) smoothScrollTo(0)
  }

  const items = [
    { id: 'about', label: 'ОБО МНЕ', to: '/', active: route === 'home' },
    { id: 'projects', label: 'ПРОЕКТЫ', to: '/projects', active: route === 'projects' },
    { id: 'contacts', label: 'КОНТАКТЫ', to: '/contacts', active: route === 'contacts' },
  ]

  return (
    <nav className={`${layout.page} ${styles.nav}`} data-test="top-nav">
      <Link to="/" className={styles.wordmark} onClick={scrollIfCurrent('/')} data-test="nav-wordmark">
        PROKSION
      </Link>

      <ul className={styles.list} data-test="nav-list">
        {items.map((it) => (
          <li key={it.id}>
            <Link
              to={it.to}
              className={`${styles.item}${it.active ? ` ${styles.itemActive}` : ''}`}
              onClick={scrollIfCurrent(it.to)}
              data-test={`nav-${it.id}`}
            >
              {it.label}
            </Link>
          </li>
        ))}
      </ul>

      <span className={styles.year} data-test="nav-year">{CURRENT_YEAR}</span>
    </nav>
  )
}
