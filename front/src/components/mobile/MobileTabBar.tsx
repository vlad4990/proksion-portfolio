import type { Route } from '../../types'
import styles from './MobileTabBar.module.css'

interface MobileTabBarProps {
  active: Route
  onAbout: () => void
  onProjects: () => void
  onContacts: () => void
}

export function MobileTabBar({ active, onAbout, onProjects, onContacts }: MobileTabBarProps) {
  const tabs: { id: Route; label: string; action: () => void }[] = [
    { id: 'home', label: 'ОБО МНЕ', action: onAbout },
    { id: 'projects', label: 'ПРОЕКТЫ', action: onProjects },
    { id: 'contacts', label: 'КОНТАКТЫ', action: onContacts },
  ]

  return (
    <nav className={styles.bar}>
      {tabs.map((t) => {
        const isActive = t.id === active
        return (
          <button key={t.id} type="button" className={styles.tab} onClick={t.action}>
            {isActive && <span className={styles.indicator} />}
            <span className={`${styles.label}${isActive ? ` ${styles.labelActive}` : ''}`}>
              {t.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
