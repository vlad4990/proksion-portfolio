// AboutScreen — node 172:5350 "Обо мне" page
//   Left half: two photos with rough vector masks stacked vertically.
//   Right half: intro paragraph, then ОПЫТ РАБОТЫ with two roles
//   (current = full red, previous = red α70), then ОБРАЗОВАНИЕ.

function MaskedPhoto({ src, mask, width, height, left, top, rotate=0, offsetX=0, offsetY=0, bgWidth, bgHeight }) {
  return (
    <div style={{
      position: 'absolute',
      left, top, width, height,
      transform: `rotate(${rotate}deg)`,
      transformOrigin: '0 0',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        left: offsetX, top: offsetY,
        width: bgWidth || width * 2,
        height: bgHeight || height * 2,
        backgroundImage: `url(${src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        WebkitMaskImage: `url(${mask})`,
        WebkitMaskSize: '100% 100%',
        WebkitMaskRepeat: 'no-repeat',
        maskImage: `url(${mask})`,
        maskSize: '100% 100%',
        maskRepeat: 'no-repeat',
      }} />
    </div>
  );
}

function JobEntry({ company, role, duration, bullets, dim }) {
  return (
    <div style={{ marginBottom: 64 }}>
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        fontFamily: 'Stengazeta, Oswald, sans-serif',
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
        fontFamily: 'Kanit, Manrope, sans-serif',
        fontWeight: 700,
        fontSize: 22,
        lineHeight: '25px',
        color: '#bfbfbf',
      }}>
        {bullets.map((b, i) => <li key={i} style={{ marginBottom: 4 }}>{b}</li>)}
      </ul>
    </div>
  );
}

function EducationEntry({ degree, school }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{
        fontFamily: 'Stengazeta, Oswald, sans-serif',
        fontWeight: 700,
        fontSize: 32,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: '#bfbfbf',
        marginBottom: 10,
      }}>{degree}</div>
      <div style={{
        fontFamily: 'Kanit, Manrope, sans-serif',
        fontWeight: 700,
        fontSize: 22,
        color: '#bfbfbf',
      }}>{school}</div>
    </div>
  );
}

function AboutScreen({ onNav }) {
  return (
    <div className="screen about" data-screen-label="02 About">
      <TopNav active="about" onNav={onNav} />

      {/* Left column — two pre-masked PNGs exported from Figma at @2x.
          The mask is baked into the alpha channel — no CSS masking needed. */}
      <img
        src="../../assets/photo-masked-1.png"
        alt=""
        style={{
          position: 'absolute',
          left: -120, top: 160,
          width: 700, height: 'auto',
          transform: 'rotate(-3deg)',
          transformOrigin: '0 0',
          pointerEvents: 'none',
        }}
      />
      <img
        src="../../assets/photo-masked-2.png"
        alt=""
        style={{
          position: 'absolute',
          left: -40, top: 960,
          width: 1280, height: 'auto',
          transform: 'rotate(2.5deg)',
          transformOrigin: '0 0',
          pointerEvents: 'none',
        }}
      />

      {/* Right column — intro + experience + education */}
      <div style={{
        position: 'absolute',
        left: 681, top: 192,
        width: 1159,
      }}>
        <p style={{
          margin: 0,
          fontFamily: 'Kanit, Manrope, sans-serif',
          fontWeight: 700,
          fontSize: 24,
          lineHeight: '30px',
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
          fontFamily: 'Stengazeta, Oswald, sans-serif',
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
          fontFamily: 'Stengazeta, Oswald, sans-serif',
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
    </div>
  );
}

window.AboutScreen = AboutScreen;
