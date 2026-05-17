// AboutSection — "ОБО МНЕ"
//   Left column: two photos with rough hand-drawn vector masks.
//   Right column: intro paragraph, ОПЫТ РАБОТЫ list, ОБРАЗОВАНИЕ list.
//   Renders WITHOUT its own top nav — it stacks below the hero on the
//   home view; the page-level fixed nav handles routing.

function JobEntry({ company, role, duration, bullets, dim }) {
  return (
    <div style={{ marginBottom: 64 }}>
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        fontFamily: 'Stengazeta, sans-serif',
        fontWeight: 700,
        fontSize: 40,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        lineHeight: 1,
        marginBottom: 22,
        whiteSpace: 'nowrap',
      }}>
        <span style={{ color: dim ? 'rgba(166,35,35,0.7)' : '#a62323', marginRight: 32 }}>{company}</span>
        <span style={{ color: '#bfbfbf' }}>{role}</span>
        <span style={{ marginLeft: 'auto', color: '#bfbfbf' }}>{duration}</span>
      </div>
      <ul style={{
        margin: 0, padding: 0, listStyle: 'none',
        fontFamily: 'Kanit, sans-serif',
        fontWeight: 700,
        fontSize: 22,
        lineHeight: '28px',
        color: '#bfbfbf',
      }}>
        {bullets.map((b, i) => <li key={i} style={{ marginBottom: 6 }}>{b}</li>)}
      </ul>
    </div>
  );
}

function EducationEntry({ degree, school }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{
        fontFamily: 'Stengazeta, sans-serif',
        fontWeight: 700,
        fontSize: 32,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: '#bfbfbf',
        marginBottom: 10,
      }}>{degree}</div>
      <div style={{
        fontFamily: 'Kanit, sans-serif',
        fontWeight: 700,
        fontSize: 22,
        color: '#bfbfbf',
      }}>{school}</div>
    </div>
  );
}

function AboutSection() {
  return (
    <section
      id="about"
      className="screen about"
      data-screen-label="01 About"
      style={{
        position: 'relative',
        width: 1920,
        minHeight: 1838,
        background: '#141414',
        overflow: 'hidden',
        paddingTop: 160,
        paddingBottom: 160,
      }}
    >
      {/* Left column — two pre-masked PNGs exported from Figma */}
      <img
        src="assets/photo-masked-1.png"
        alt=""
        style={{
          position: 'absolute',
          left: -120, top: 200,
          width: 700, height: 'auto',
          transform: 'rotate(-3deg)',
          transformOrigin: '0 0',
          pointerEvents: 'none',
        }}
      />
      <img
        src="assets/photo-masked-2.png"
        alt=""
        style={{
          position: 'absolute',
          left: -40, top: 1000,
          width: 1280, height: 'auto',
          transform: 'rotate(2.5deg)',
          transformOrigin: '0 0',
          pointerEvents: 'none',
        }}
      />

      {/* Right column — intro + experience + education */}
      <div style={{
        position: 'absolute',
        left: 681, top: 232,
        width: 1159,
      }}>
        <p style={{
          margin: 0,
          fontFamily: 'Kanit, sans-serif',
          fontWeight: 700,
          fontSize: 24,
          lineHeight: '32px',
          color: '#c4c4c4',
        }}>
          С детства я рисую, играю в компьютер, занимаюсь музыкой и
          полностью погружена в творчество по сей день: люблю комиксы,
          фильмы, путешествия, активно веду скетчбук, пробую себя в
          разных хобби.
        </p>

        <h2 style={{
          marginTop: 96,
          marginBottom: 56,
          fontFamily: 'Stengazeta, sans-serif',
          fontWeight: 700,
          fontSize: 80,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: '#bfbfbf',
          lineHeight: 1,
        }}>Опыт работы</h2>

        <JobEntry
          company="LOFTY."
          role="ГРАФИЧЕСКИЙ ДИЗАЙНЕР"
          duration="1.5 ГОДА"
          dim={false}
          bullets={[
            'Работа с креативами: баннеры, оформление smm-постов',
            'Обновление и формирование фирменного стиля для smm и коммуникация с отделом маркетинга',
            'Подготовка материалов на сайт, передача материалов продуктовому дизайну и коммуникация с отделом разработки',
            'Работа с UI-kit компании, разработка макетов под ивенты на сайт, создание витрин под продукты, общение с разработчиками',
            'Оптимизация работы графического дизайна, точечное внедрение ИИ, создание шаблонов для ведения каналов и контента',
            'Планирование и распределение нагрузки, ответственность за качество выполняемых задач',
          ]}
        />

        <JobEntry
          company="КОПИРКА"
          role="ГРАФИЧЕСКИЙ ДИЗАЙНЕР"
          duration="6 МЕСЯЦЕВ"
          dim
          bullets={[
            'Создание дизайн-проектов / дизайн и верстка сувенирной и полиграфической продукции',
            'Фото на документы, ретуширование, печать фотографий.',
            'Консультирование клиентов по услугам, прямая работа с заказчиками.',
            'Периодическое выполнение копировальных и печатных работ, передача заказов на производство.',
            'Создание визиток/брошюр.',
            'Разработка печатей/штампов по заказу и оттиску.',
          ]}
        />

        <h2 style={{
          marginTop: 80,
          marginBottom: 56,
          fontFamily: 'Stengazeta, sans-serif',
          fontWeight: 700,
          fontSize: 80,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: '#bfbfbf',
          lineHeight: 1,
        }}>Образование</h2>

        <EducationEntry
          degree="Художник-мастер, педагог."
          school="Колледж декоративно-прикладного искусства им. Карла Фаберже"
        />
        <EducationEntry
          degree="Монументальная живопись"
          school="РГУ ИМ. А.Н.КОСЫГИНА, Институт искусств"
        />
      </div>
    </section>
  );
}

window.AboutSection = AboutSection;
