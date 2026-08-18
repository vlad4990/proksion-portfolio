// Страница «Обо мне» — мобайл (дизайн: фрейм q7llNK «1M. Обо мне — MOBILE»).
// Титул + лид → пилюли «чем занимаюсь» → фото → «ОПЫТ РАБОТЫ» → «ОБРАЗОВАНИЕ» → футер.
// Контент — из lib/about.ts (общий с десктопным AboutSection).
// Mobile Header / Status Bar из фрейма не делаем — остаётся текущий фиксированный
// мини-хедер экрана и общий MobileTabBar (та же договорённость, что на /projects).

import markerPixel from '../../assets/icon-marker-pixel.svg'
import photoMasked1 from '../../assets/photo-masked-1-full.webp'
import {
  ABOUT_LEAD,
  ABOUT_SKILLS,
  ABOUT_SKILLS_LABEL,
  EDUCATION,
  EDUCATION_BADGE,
  EDUCATION_HEADING,
  EDUCATION_META,
  EXPERIENCE_BADGE,
  EXPERIENCE_HEADING,
  EXPERIENCE_META,
  JOBS,
} from '../../lib/about'
import type { Education, Job } from '../../lib/about'
import { Badge } from '../shared/Badge'
import { MobileTabBar } from './MobileTabBar'
import { ProjectsFooter } from './ProjectsFooter'
import styles from './MobileAbout.module.css'

interface SectionHeadProps {
  title: string
  badge: string
  meta: string
  /** Образование: бейдж стоит в строке титула — мета-строка длинная и занимает свою. */
  badgeInTitle?: boolean
}

function SectionHead({ title, badge, meta, badgeInTitle = false }: SectionHeadProps) {
  const badgeNode = <Badge mobile testId="about-section-badge">{badge}</Badge>
  return (
    <div className={styles.head} data-test="about-section-head">
      <div className={styles.headLine}>
        <img className={styles.glyph} src={markerPixel} alt="" />
        <h2 className={styles.headTitle}>{title}</h2>
        {badgeInTitle && badgeNode}
      </div>
      <div className={styles.headMetaRow}>
        {!badgeInTitle && badgeNode}
        <span className={styles.headMeta}>{meta}</span>
      </div>
    </div>
  )
}

function MobileJobEntry({ company, role, duration, bullets, dim }: Job) {
  return (
    <div className={styles.job} data-test="about-job">
      <div className={styles.jobHead}>
        <span className={dim ? styles.companyDim : styles.company}>{company}</span>
        <Badge mobile testId="about-job-duration">{duration}</Badge>
      </div>
      <span className={styles.role}>{role}</span>
      <ul className={styles.bullets}>
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </div>
  )
}

function MobileEduEntry({ degree, school }: Education) {
  return (
    <div className={styles.edu} data-test="about-education">
      <h3 className={styles.eduDegree}>{degree}</h3>
      <span className={styles.eduSchool}>{school}</span>
    </div>
  )
}

export function MobileAbout() {
  return (
    <div className={styles.page} data-test="about">
      <header className={styles.header} data-test="mobile-header">
        <span className={styles.headerWordmark} data-test="mobile-wordmark">PROKSION</span>
      </header>

      <div className={styles.content} data-test="about-content">
        <div className={styles.hero}>
          <h1 className={styles.title} data-test="about-title">ОБО МНЕ</h1>
          <p className={styles.lead} data-test="about-intro">
            {ABOUT_LEAD}
          </p>
        </div>

        <div className={styles.skills} data-test="about-skills">
          <span className={styles.skillsLabel}>{ABOUT_SKILLS_LABEL}</span>
          <ul className={styles.chips}>
            {ABOUT_SKILLS.map((skill) => (
              <li key={skill} className={styles.chip}>
                {skill}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.photoBlock} data-test="about-photo">
          <div className={styles.photoFrame}>
            <img className={styles.photo} src={photoMasked1} alt="" />
          </div>
        </div>

        <section className={styles.section} data-test="about-experience">
          <SectionHead
            title={EXPERIENCE_HEADING}
            badge={EXPERIENCE_BADGE}
            meta={EXPERIENCE_META}
          />
          <div className={styles.jobs}>
            {JOBS.map((job) => (
              <MobileJobEntry key={job.company} {...job} />
            ))}
          </div>
        </section>

        <section
          className={`${styles.section} ${styles.sectionLast}`}
          data-test="about-education-section"
        >
          <SectionHead
            title={EDUCATION_HEADING}
            badge={EDUCATION_BADGE}
            meta={EDUCATION_META}
            badgeInTitle
          />
          <div className={styles.eduList}>
            {EDUCATION.map((e) => (
              <MobileEduEntry key={e.degree} {...e} />
            ))}
          </div>
        </section>

        <ProjectsFooter />
      </div>

      <MobileTabBar active="home" />
    </div>
  )
}
