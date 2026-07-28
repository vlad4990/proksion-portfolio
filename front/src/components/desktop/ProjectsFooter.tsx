// Футер страниц /projects* — десктоп (дизайн: фрейм tVnqG, узел «Footer»).
// CTA-заголовок → email + кнопка Telegram → нижний бар (© + соцссылки).
// Контакты — константы из lib/contacts.ts (те же значения, что на /contacts).
// Подключается страницами задач 18–19; сам маршрутов не знает.

import {
  EMAIL,
  FOOTER_COPYRIGHT,
  FOOTER_CTA,
  FOOTER_SOCIALS,
  FOOTER_TELEGRAM_LABEL,
  TELEGRAM,
} from '../../lib/contacts'
import layout from '../../styles/layout.module.css'
import styles from './ProjectsFooter.module.css'

export function ProjectsFooter() {
  return (
    <footer className={styles.footer} data-test="projects-footer">
      <div className={`${layout.page} ${styles.inner}`}>
        <h2 className={styles.cta} data-test="footer-cta">
          {FOOTER_CTA}
        </h2>

        <div className={styles.row}>
          <a className={styles.email} href={EMAIL.href} data-test="footer-email">
            {EMAIL.value}
          </a>
          <a
            className={styles.tgButton}
            href={TELEGRAM.href}
            target="_blank"
            rel="noreferrer"
            data-test="footer-telegram"
          >
            {FOOTER_TELEGRAM_LABEL}
            <span className={styles.tgArrow} aria-hidden="true">
              ↗
            </span>
          </a>
        </div>

        <div className={styles.bottomBar}>
          <span className={styles.copy} data-test="footer-copy">
            {FOOTER_COPYRIGHT}
          </span>
          <div className={styles.socials}>
            {FOOTER_SOCIALS.map((s) => (
              <a
                key={s.label}
                className={styles.social}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                data-test="footer-social"
              >
                {s.label} ↗
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
