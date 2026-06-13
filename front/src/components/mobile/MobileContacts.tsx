import type { Route } from '../../types'
import { MobileTabBar } from './MobileTabBar'
import styles from './MobileContacts.module.css'

const ROWS = [
  { label: 'TELEGRAM', value: '@kristina_pr', href: 'https://t.me/kristina_pr' },
  { label: 'EMAIL', value: 'hi@proksion.ru', href: 'mailto:hi@proksion.ru' },
  { label: 'BEHANCE', value: 'behance.net/proksion', href: 'https://behance.net/proksion' },
  { label: 'CV / PDF', value: 'Скачать резюме →', href: '#' },
]

export function MobileContacts({ onNav }: { onNav: (r: Route) => void }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.headerWordmark}>PROKSION</span>
      </header>

      <div className={styles.content}>
        <h1 className={styles.title}>
          КОНТАК-
          <br />
          ТЫ
        </h1>

        <p className={styles.note}>
          Открыта к проектным и full-time предложениям. Напишите по любому из
          каналов — обычно отвечаю в течение суток.
        </p>

        <div className={styles.rows}>
          {ROWS.map((r) => (
            <a key={r.label} className={styles.rowLink} href={r.href}>
              <div className={styles.row}>
                <span className={styles.rowLabel}>{r.label}</span>
                <span className={styles.rowValue}>{r.value}</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      <MobileTabBar
        active="contacts"
        onAbout={() => onNav('home')}
        onProjects={() => onNav('projects')}
        onContacts={() => onNav('contacts')}
      />
    </div>
  )
}
