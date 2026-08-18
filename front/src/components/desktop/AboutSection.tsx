// Страница «Обо мне» — десктоп (дизайн: фрейм P6kgA «1. Обо мне — Hero-сплит»).
// Hero-сплит (лид + пилюли «чем занимаюсь» слева, фото справа) → секция «ОПЫТ РАБОТЫ»
// (карточка компании слева, буллеты в две колонки справа) → секция «ОБРАЗОВАНИЕ» → футер.
// Контент — из lib/about.ts (общий с мобильным деревом), контакты футера — lib/contacts.ts.

import markerPixel from '../../assets/icon-marker-pixel.svg'
import photoMasked1 from '../../assets/photo-masked-1-full.webp'
import {
  ABOUT_LEAD,
  ABOUT_SKILLS_LABEL,
  ABOUT_SKILL_ROWS,
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
import layout from '../../styles/layout.module.css'
import { ProjectsFooter } from './ProjectsFooter'
import styles from './AboutSection.module.css'

/** Голова секции: глиф-курсор + титул + бейдж слева, мета-строка справа. */
function SectionHead({ title, badge, meta }: { title: string; badge: string; meta: string }) {
  return (
    <div className={styles.head} data-test="about-section-head">
      <div className={styles.headLine}>
        <img className={styles.glyph} src={markerPixel} alt="" />
        <h2 className={styles.headTitle}>{title}</h2>
        <Badge testId="about-section-badge">{badge}</Badge>
      </div>
      <span className={styles.headMeta}>{meta}</span>
    </div>
  )
}

function JobEntry({ company, role, duration, bullets, dim }: Job) {
  return (
    <div className={styles.job} data-test="about-job">
      <div className={styles.jobLeft}>
        <span className={dim ? styles.companyDim : styles.company}>{company}</span>
        <span className={styles.role}>{role}</span>
        <span className={styles.duration}>
          <Badge testId="about-job-duration">{duration}</Badge>
        </span>
      </div>
      <ul className={styles.bullets}>
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </div>
  )
}

function EducationEntry({ degree, school }: Education) {
  return (
    <div className={styles.edu} data-test="about-education">
      <h3 className={styles.eduDegree}>{degree}</h3>
      <span className={styles.eduSchool}>{school}</span>
    </div>
  )
}

export function AboutSection() {
  return (
    <div className={styles.screen} data-screen-label="01 About" data-test="about">
      <section className={styles.hero}>
        <div className={`${layout.page} ${styles.heroInner}`}>
          <div className={styles.heroLeft}>
            <p className={styles.lead} data-test="about-intro">
              {ABOUT_LEAD}
            </p>

            <div className={styles.skills} data-test="about-skills">
              <span className={styles.skillsLabel}>{ABOUT_SKILLS_LABEL}</span>
              {ABOUT_SKILL_ROWS.map((row) => (
                <ul key={row[0]} className={styles.chips}>
                  {row.map((skill) => (
                    <li key={skill} className={styles.chip}>
                      {skill}
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>

          <div className={styles.photoFrame} data-test="about-photo">
            {/* Окно обрезки отдельным слоем: оно продлено ниже кадра — до hairline секции. */}
            <div className={styles.photoClip}>
              <img className={styles.photo} src={photoMasked1} alt="" />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} data-test="about-experience">
        <div className={layout.page}>
          <SectionHead
            title={EXPERIENCE_HEADING}
            badge={EXPERIENCE_BADGE}
            meta={EXPERIENCE_META}
          />
          <div className={styles.jobs}>
            {JOBS.map((job) => (
              <JobEntry key={job.company} {...job} />
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionLast}`} data-test="about-education-section">
        <div className={layout.page}>
          <SectionHead title={EDUCATION_HEADING} badge={EDUCATION_BADGE} meta={EDUCATION_META} />
          <div className={styles.eduList}>
            {EDUCATION.map((e) => (
              <EducationEntry key={e.degree} {...e} />
            ))}
          </div>
        </div>
      </section>

      <ProjectsFooter />
    </div>
  )
}
