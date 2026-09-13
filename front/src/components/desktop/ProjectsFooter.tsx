// Футер страниц /projects* — десктоп (дизайн: фрейм tVnqG, узел «Footer»).
// Лид «Открыта к предложениям» + бейдж доступности → email + CV/PDF + кнопка Telegram →
// нижний бар (© + соцссылки). Контакты — константы из lib/contacts.ts (те же значения, что на /contacts).
// Подключается страницами задач 18–19; сам маршрутов не знает.

import {
  CV,
  EMAIL,
  FOOTER_AVAILABILITY_LABEL,
  FOOTER_COPYRIGHT,
  FOOTER_LEAD_SUBTITLE,
  FOOTER_LEAD_TITLE,
  FOOTER_CV_LABEL,
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
        <div className={styles.topRow}>
          <div className={styles.lead}>
            <p className={styles.leadTitle} data-test="footer-lead-title">
              {FOOTER_LEAD_TITLE}
            </p>
            <p className={styles.leadSubtitle}>{FOOTER_LEAD_SUBTITLE}</p>
          </div>
          <div className={styles.availability} data-test="footer-availability">
            <span className={styles.dot} aria-hidden="true" />
            {FOOTER_AVAILABILITY_LABEL}
          </div>
        </div>

        <div className={styles.row}>
          <a className={styles.email} href={EMAIL.href} data-test="footer-email">
            {EMAIL.value}
          </a>
          <div className={styles.actions}>
            <a className={styles.cvButton} href={CV.href} download data-test="footer-cv">
              {FOOTER_CV_LABEL}
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
