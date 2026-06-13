import photoMasked1 from '../../assets/photo-masked-1-full.png'
import photoMasked2 from '../../assets/photo-masked-2.png'
import type { Route } from '../../types'
import { MobileTabBar } from './MobileTabBar'
import styles from './MobileAbout.module.css'

interface Job {
  company: string
  role: string
  duration: string
  dim?: boolean
  bullets: string[]
}

const JOBS: Job[] = [
  {
    company: 'LOFTY.',
    role: 'Графический дизайнер',
    duration: '1.5 года',
    bullets: [
      'Баннеры, оформление SMM-постов',
      'Фирменный стиль для SMM, коммуникация с маркетингом',
      'Подготовка материалов на сайт, работа с UI-kit',
      'Оптимизация процессов, точечное внедрение ИИ',
    ],
  },
  {
    company: 'КОПИРКА',
    role: 'Графический дизайнер',
    duration: '6 месяцев',
    dim: true,
    bullets: [
      'Сувенирная и полиграфическая продукция',
      'Ретушь, печать фотографий',
      'Визитки, брошюры, печати и штампы',
    ],
  },
]

const EDUCATION = [
  {
    degree: 'Художник-мастер, педагог',
    school: 'Колледж декоративно-прикладного искусства им. Карла Фаберже',
  },
  {
    degree: 'Монументальная живопись',
    school: 'РГУ им. А.Н. Косыгина, Институт искусств',
  },
]

function MobileJobEntry({ company, role, duration, bullets, dim }: Job) {
  return (
    <div className={styles.job}>
      <div className={styles.jobHead}>
        <span className={dim ? styles.companyDim : styles.company}>{company}</span>
        <span className={styles.duration}>{duration}</span>
      </div>
      <div className={styles.role}>{role}</div>
      <ul className={styles.bullets}>
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </div>
  )
}

function MobileEduEntry({ degree, school }: { degree: string; school: string }) {
  return (
    <div className={styles.edu}>
      <div className={styles.eduDegree}>{degree}</div>
      <div className={styles.eduSchool}>{school}</div>
    </div>
  )
}

export function MobileAbout({ onNav }: { onNav: (r: Route) => void }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.headerWordmark}>PROKSION</span>
      </header>

      <div className={styles.content}>
        <h1 className={styles.title}>
          ОБО
          <br />
          МНЕ
        </h1>

        <p className={styles.intro}>
          С детства я рисую, играю в компьютер, занимаюсь музыкой и полностью
          погружена в творчество по сей день — комиксы, фильмы, путешествия,
          активно веду скетчбук, пробую себя в разных хобби.
        </p>

        <h2 className={styles.heading}>Опыт работы</h2>
        {JOBS.map((job) => (
          <MobileJobEntry key={job.company} {...job} />
        ))}

        <h2 className={`${styles.heading} ${styles.headingSpaced}`}>Образование</h2>
        {EDUCATION.map((e) => (
          <MobileEduEntry key={e.degree} {...e} />
        ))}

        <div className={styles.footer}>
          <img className={styles.footerBack} src={photoMasked2} alt="" />
          <img className={styles.footerFront} src={photoMasked1} alt="" />
        </div>
      </div>

      <MobileTabBar
        active="home"
        onAbout={() => onNav('home')}
        onProjects={() => onNav('projects')}
        onContacts={() => onNav('contacts')}
      />
    </div>
  )
}
