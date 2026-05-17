// MobileAbout — "ОБО МНЕ" page (mobile).
//   Fixed mini-header: PROKSION centered, hairline bottom.
//   Scrollable content: page title → masked photo → intro →
//   ОПЫТ РАБОТЫ (LOFTY + КОПИРКА) → ОБРАЗОВАНИЕ.
//   Fixed bottom: MobileTabBar (active="home").

function MobileJobEntry({ company, role, duration, bullets, dim }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        gap: '2px 12px',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 'var(--t-job-mob)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        lineHeight: 1.2,
        marginBottom: 4,
      }}>
        <span style={{ color: dim ? 'var(--accent-dim)' : 'var(--accent)' }}>{company}</span>
        <span style={{ color: 'var(--fg-muted)' }}>{duration}</span>
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--t-job-role-mob)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: 'var(--fg-muted)',
        marginBottom: 10,
      }}>{role}</div>
      <ul style={{
        margin: 0, padding: 0, listStyle: 'none',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--t-body-mob)',
        fontWeight: 700,
        lineHeight: 1.5,
        color: 'var(--fg-muted)',
      }}>
        {bullets.map((b, i) => (
          <li key={i} style={{ marginBottom: 4, paddingLeft: 14, position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 0, top: '0.6em',
              width: 4, height: 4,
              background: 'var(--fg-muted)',
              opacity: 0.4,
              borderRadius: '50%',
              display: 'block',
            }} />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MobileEduEntry({ degree, school }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--t-job-mob)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: 'var(--fg-muted)',
        fontWeight: 700,
        marginBottom: 4,
      }}>{degree}</div>
      <div style={{
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--t-small-mob)',
        fontWeight: 700,
        color: 'var(--fg-muted)',
        lineHeight: 1.4,
      }}>{school}</div>
    </div>
  );
}

function MobileAbout({ onNav }) {
  const navFn = { onAbout: () => onNav('home'), onProjects: () => onNav('projects'), onContacts: () => onNav('contacts') };
  return (
    <div style={{
      background: 'var(--bg)',
      minHeight: '100dvh',
      position: 'relative',
    }}>
      {/* Mini top bar */}
      <header style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 'var(--mob-content-top)',
        background: 'var(--bg)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: 14,
        zIndex: 100,
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--t-hero-mob)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--accent)',
          lineHeight: 1,
        }}>PROKSION</span>
      </header>

      {/* Scrollable content */}
      <div style={{
        paddingTop: 'calc(var(--mob-content-top) + 24px)',
        paddingBottom: 'calc(var(--mob-tabbar) + 24px)',
        paddingLeft: 'var(--mob-pad)',
        paddingRight: 'var(--mob-pad)',
      }}>
        {/* Page title */}
        <h1 style={{
          margin: '0 0 24px',
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--t-section-mob)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--fg-muted)',
          lineHeight: 0.95,
        }}>ОБО<br />МНЕ</h1>

        {/* Photo — pre-masked PNG from Figma */}
        <div style={{ marginBottom: 24, marginLeft: -22, width: 'calc(100% + 22px)' }}>
          <img
            src="assets/photo-masked-1.png"
            alt=""
            style={{
              width: '85%',
              height: 'auto',
              transform: 'rotate(-2deg)',
              transformOrigin: '0 0',
              display: 'block',
            }}
          />
        </div>

        {/* Intro */}
        <p style={{
          margin: '0 0 32px',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--t-body-mob)',
          fontWeight: 700,
          lineHeight: 1.55,
          color: 'var(--fg)',
        }}>
          С детства я рисую, играю в компьютер, занимаюсь музыкой и полностью
          погружена в творчество по сей день — комиксы, фильмы, путешествия,
          активно веду скетчбук, пробую себя в разных хобби.
        </p>

        {/* ОПЫТ РАБОТЫ */}
        <h2 style={{
          margin: '0 0 20px',
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--t-section-sm-mob)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--fg-muted)',
          lineHeight: 1,
        }}>Опыт работы</h2>

        <MobileJobEntry
          company="LOFTY."
          role="Графический дизайнер"
          duration="1.5 года"
          dim={false}
          bullets={[
            'Баннеры, оформление SMM-постов',
            'Фирменный стиль для SMM, коммуникация с маркетингом',
            'Подготовка материалов на сайт, работа с UI-kit',
            'Оптимизация процессов, точечное внедрение ИИ',
          ]}
        />

        <MobileJobEntry
          company="КОПИРКА"
          role="Графический дизайнер"
          duration="6 месяцев"
          dim
          bullets={[
            'Сувенирная и полиграфическая продукция',
            'Ретушь, печать фотографий',
            'Визитки, брошюры, печати и штампы',
          ]}
        />

        {/* ОБРАЗОВАНИЕ */}
        <h2 style={{
          margin: '14px 0 20px',
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--t-section-sm-mob)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--fg-muted)',
          lineHeight: 1,
        }}>Образование</h2>

        <MobileEduEntry
          degree="Художник-мастер, педагог"
          school="Колледж декоративно-прикладного искусства им. Карла Фаберже"
        />
        <MobileEduEntry
          degree="Монументальная живопись"
          school="РГУ им. А.Н. Косыгина, Институт искусств"
        />
      </div>

      <MobileTabBar active="home" {...navFn} />
    </div>
  );
}

window.MobileAbout = MobileAbout;
