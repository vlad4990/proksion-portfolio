// Футер страниц /projects* — мобайл (дизайн: фрейм N8NrSi, узел «Footer»).
// Та же информация, что на десктопе, в столбик: лид + бейдж доступности → email →
// CV/PDF → TG-кнопка во всю ширину → нижний бар (соцссылки, затем ©). Контакты — из lib/contacts.ts.
// Подключается страницами задач 18–19.

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
import { Arrow } from '../shared/Arrow'
import styles from './ProjectsFooter.module.css'

export function ProjectsFooter() {
  return (
    <footer className={styles.footer} data-test="projects-footer">
      <div className={styles.availability} data-test="footer-availability">
        <span className={styles.dot} aria-hidden="true" />
        {FOOTER_AVAILABILITY_LABEL}
      </div>

      <div className={styles.lead}>
        <p className={styles.leadTitle} data-test="footer-lead-title">
          {FOOTER_LEAD_TITLE}
        </p>
        <p className={styles.leadSubtitle}>{FOOTER_LEAD_SUBTITLE}</p>
      </div>

      <a className={styles.email} href={EMAIL.href} data-test="footer-email">
        {EMAIL.value}
      </a>

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
        <Arrow className={styles.tgArrow} />
      </a>

      <div className={styles.bottomBar}>
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
              {s.label} <Arrow />
            </a>
          ))}
        </div>
        <span className={styles.copy} data-test="footer-copy">
          {FOOTER_COPYRIGHT}
        </span>
      </div>
    </footer>
  )
}
