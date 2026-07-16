import { Link, useLocation } from 'react-router'
import type { Route } from '../../types'
import { smoothScrollTo } from '../../lib/scroll'
import styles from './MobileTabBar.module.css'

interface MobileTabBarProps {
  active: Route
}

const TABS: { id: Route; label: string; to: string }[] = [
  { id: 'home', label: 'ОБО МНЕ', to: '/' },
  { id: 'projects', label: 'ПРОЕКТЫ', to: '/projects' },
  { id: 'contacts', label: 'КОНТАКТЫ', to: '/contacts' },
]

/** Нижний таб-бар — настоящие <Link>; скролл к началу при смене листинга делает App. Клик по
 *  уже открытому табу (ссылка — no-op) докручивает раздел к началу — как в TopNav. */
export function MobileTabBar({ active }: MobileTabBarProps) {
  const { pathname } = useLocation()
  const scrollIfCurrent = (to: string) => () => {
    if (pathname === to) smoothScrollTo(0)
  }

  return (
    <nav className={styles.bar} data-test="tab-bar">
      {TABS.map((t) => {
        const isActive = t.id === active
        return (
          <Link
            key={t.id}
            to={t.to}
            className={styles.tab}
            onClick={scrollIfCurrent(t.to)}
            data-test={`tab-${t.id}`}
          >
            {isActive && <span className={styles.indicator} />}
            <span className={`${styles.label}${isActive ? ` ${styles.labelActive}` : ''}`}>
              {t.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
