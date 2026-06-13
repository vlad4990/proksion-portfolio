import layout from '../../styles/layout.module.css'
import styles from './ContactsScreen.module.css'

interface Row {
  index: string
  label: string
  value: string
  href: string
  download?: boolean
}

const ROWS: Row[] = [
  { index: '01', label: 'TELEGRAM', value: '@kristina_pr', href: 'https://t.me/kristina_pr' },
  { index: '02', label: 'EMAIL', value: 'hi@proksion.ru', href: 'mailto:hi@proksion.ru' },
  { index: '03', label: 'BEHANCE', value: 'behance.net/proksion', href: 'https://behance.net/proksion' },
  { index: '04', label: 'CV / PDF', value: 'Скачать резюме', href: '#', download: true },
]

function ContactRow({ index, label, value, href, download }: Row) {
  const isExternal = href.startsWith('http')
  return (
    <a
      className={styles.row}
      href={href}
      download={download}
      target={isExternal ? '_blank' : undefined}
      rel="noreferrer"
    >
      <span className={styles.index}>{index}</span>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      <span className={styles.arrow}>↗</span>
    </a>
  )
}

export function ContactsScreen() {
  return (
    <section id="contacts" className={styles.section} data-screen-label="03 Contacts">
      <div className={`${layout.page} ${styles.grid}`}>
        <div>
          <div className={styles.kicker}>[ Связь ]</div>

          <h1 className={styles.headline}>
            Контак-
            <br />
            ты
          </h1>

          <p className={styles.note}>
            Открыта к проектным и full-time предложениям. Напишите по любому из
            каналов — обычно отвечаю в течение суток.
          </p>

          <div className={styles.status}>
            <span className={styles.statusDot} />
            <span className={styles.statusLabel}>Доступна для работы</span>
          </div>

          <div className={styles.meta}>МОСКВА · 2025</div>
        </div>

        <div>
          {ROWS.map((r) => (
            <ContactRow key={r.label} {...r} />
          ))}
          <div className={styles.closingRule} />

          <div className={styles.footnote}>
            Предпочитаю Telegram для быстрых вопросов и почту — для брифов и
            вложений.
          </div>
        </div>
      </div>
    </section>
  )
}
