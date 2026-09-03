import { CONTACT_CHANNELS, CURRENT_YEAR, type ContactChannel } from '../../lib/contacts'
import layout from '../../styles/layout.module.css'
import styles from './ContactsScreen.module.css'

/** Строка канала = константа из lib/contacts.ts + порядковый номер («01»…«04»). */
type Row = ContactChannel & { index: string }

const ROWS: Row[] = CONTACT_CHANNELS.map((c, i) => ({
  ...c,
  index: String(i + 1).padStart(2, '0'),
}))

function ContactRow({ index, label, value, href, download }: Row) {
  const isExternal = href.startsWith('http')
  return (
    <a
      className={styles.row}
      href={href}
      download={download}
      target={isExternal ? '_blank' : undefined}
      rel="noreferrer"
      data-test="contacts-row"
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
    <section id="contacts" className={styles.section} data-screen-label="03 Contacts" data-test="contacts">
      <div className={`${layout.page} ${styles.grid}`}>
        <div data-test="contacts-info">
          <div className={styles.kicker} data-test="contacts-kicker">[ Связь ]</div>

          <h1 className={styles.headline} data-test="contacts-title">
            Контак-
            <br />
            ты
          </h1>

          <p className={styles.note} data-test="contacts-note">
            Открыта к проектным и full-time предложениям. Напишите по любому из
            каналов — обычно отвечаю в течение суток.
          </p>

          <div className={styles.status} data-test="contacts-status">
            <span className={styles.statusDot} />
            <span className={styles.statusLabel}>Доступна для работы</span>
          </div>

          <div className={styles.meta} data-test="contacts-meta">МОСКВА · {CURRENT_YEAR}</div>
        </div>

        <div data-test="contacts-channels">
          {ROWS.map((r) => (
            <ContactRow key={r.label} {...r} />
          ))}
          <div className={styles.closingRule} data-test="contacts-rule" />

          <div className={styles.footnote} data-test="contacts-footnote">
            Предпочитаю Telegram для быстрых вопросов и почту — для брифов и
            вложений.
          </div>
        </div>
      </div>
    </section>
  )
}
