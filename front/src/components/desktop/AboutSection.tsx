import photoMasked1 from '../../assets/photo-masked-1-full.webp'
import photoMasked2 from '../../assets/photo-masked-2.webp'
import layout from '../../styles/layout.module.css'
import styles from './AboutSection.module.css'

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
    role: 'ГРАФИЧЕСКИЙ ДИЗАЙНЕР',
    duration: '1.5 ГОДА',
    bullets: [
      'Работа с креативами: баннеры, оформление smm-постов',
      'Обновление и формирование фирменного стиля для smm и коммуникация с отделом маркетинга',
      'Подготовка материалов на сайт, передача материалов продуктовому дизайну и коммуникация с отделом разработки',
      'Работа с UI-kit компании, разработка макетов под ивенты на сайт, создание витрин под продукты, общение с разработчиками',
      'Оптимизация работы графического дизайна, точечное внедрение ИИ, создание шаблонов для ведения каналов и контента',
      'Планирование и распределение нагрузки, ответственность за качество выполняемых задач',
    ],
  },
  {
    company: 'КОПИРКА',
    role: 'ГРАФИЧЕСКИЙ ДИЗАЙНЕР',
    duration: '6 МЕСЯЦЕВ',
    dim: true,
    bullets: [
      'Создание дизайн-проектов / дизайн и верстка сувенирной и полиграфической продукции',
      'Фото на документы, ретуширование, печать фотографий.',
      'Консультирование клиентов по услугам, прямая работа с заказчиками.',
      'Периодическое выполнение копировальных и печатных работ, передача заказов на производство.',
      'Создание визиток/брошюр.',
      'Разработка печатей/штампов по заказу и оттиску.',
    ],
  },
]

const EDUCATION = [
  {
    degree: 'Художник-мастер, педагог.',
    school: 'Колледж декоративно-прикладного искусства им. Карла Фаберже',
  },
  {
    degree: 'Монументальная живопись',
    school: 'РГУ ИМ. А.Н.КОСЫГИНА, Институт искусств',
  },
]

function JobEntry({ company, role, duration, bullets, dim }: Job) {
  return (
    <div className={styles.job} data-test="about-job">
      <div className={styles.jobHead}>
        <span className={dim ? styles.companyDim : styles.company}>{company}</span>
        <span className={styles.role}>{role}</span>
        <span className={styles.duration}>{duration}</span>
      </div>
      <ul className={styles.bullets}>
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </div>
  )
}

function EducationEntry({ degree, school }: { degree: string; school: string }) {
  return (
    <div className={styles.edu} data-test="about-education">
      <div className={styles.eduDegree}>{degree}</div>
      <div className={styles.eduSchool}>{school}</div>
    </div>
  )
}

export function AboutSection() {
  return (
    <section id="about" className={styles.section} data-screen-label="01 About" data-test="about">
      <div className={`${layout.page} ${styles.grid}`}>
        <div className={styles.photos} data-test="about-photos">
          <img className={styles.photo1} src={photoMasked1} alt="" />
          <img className={styles.photo2} src={photoMasked2} alt="" />
        </div>

        <div data-test="about-body">
          <p className={styles.intro} data-test="about-intro">
            С детства я рисую, играю в компьютер, занимаюсь музыкой и полностью
            погружена в творчество по сей день: люблю комиксы, фильмы, путешествия,
            активно веду скетчбук, пробую себя в разных хобби.
          </p>

          <h2 className={styles.heading} data-test="about-experience-heading">Опыт работы</h2>
          {JOBS.map((job) => (
            <JobEntry key={job.company} {...job} />
          ))}

          <h2 className={styles.heading} data-test="about-education-heading">Образование</h2>
          {EDUCATION.map((e) => (
            <EducationEntry key={e.degree} {...e} />
          ))}
        </div>
      </div>
    </section>
  )
}
