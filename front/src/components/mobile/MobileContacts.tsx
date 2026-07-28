import { CONTACT_CHANNELS } from '../../lib/contacts'
import { MobileTabBar } from './MobileTabBar'
import styles from './MobileContacts.module.css'

const ROWS = CONTACT_CHANNELS

export function MobileContacts() {
  return (
    <div className={styles.page} data-test="contacts">
      <header className={styles.header} data-test="mobile-header">
        <span className={styles.headerWordmark} data-test="mobile-wordmark">PROKSION</span>
      </header>

      <div className={styles.content} data-test="contacts-content">
        <h1 className={styles.title} data-test="contacts-title">
          КОНТАК-
          <br />
          ТЫ
        </h1>

        <p className={styles.note} data-test="contacts-note">
          Открыта к проектным и full-time предложениям. Напишите по любому из
          каналов — обычно отвечаю в течение суток.
        </p>

        <div className={styles.rows} data-test="contacts-channels">
          {ROWS.map((r) => (
            <a key={r.label} className={styles.rowLink} href={r.href} data-test="contacts-row">
              <div className={styles.row}>
                <span className={styles.rowLabel}>{r.label}</span>
                <span className={styles.rowValue}>{r.download ? `${r.value} →` : r.value}</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      <MobileTabBar active="contacts" />
    </div>
  )
}
