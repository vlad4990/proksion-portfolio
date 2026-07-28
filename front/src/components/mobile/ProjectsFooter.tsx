// Футер страниц /projects* — мобайл (дизайн: фрейм N8NrSi, узел «Footer»).
// Та же информация, что на десктопе, в столбик: CTA → email → TG-кнопка во всю ширину →
// нижний бар (соцссылки, затем ©). Контакты — из lib/contacts.ts.
// Подключается страницами задач 18–19.

import {
  EMAIL,
  FOOTER_COPYRIGHT,
  FOOTER_CTA,
  FOOTER_SOCIALS,
  FOOTER_TELEGRAM_LABEL,
  TELEGRAM,
} from '../../lib/contacts'
import styles from './ProjectsFooter.module.css'

export function ProjectsFooter() {
  return (
    <footer className={styles.footer} data-test="projects-footer">
      <h2 className={styles.cta} data-test="footer-cta">
        {FOOTER_CTA}
      </h2>

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
              {s.label} ↗
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
