// MobileContacts — "КОНТАКТЫ" page (mobile). New page, no desktop equivalent.
//   Fixed mini-header: PROKSION centered.
//   Page title: КОНТАКТЫ.
//   Brief availability note.
//   Four contact rows: TELEGRAM / EMAIL / BEHANCE / CV·PDF.
//   Fixed bottom: MobileTabBar (active="contacts").

function MobileContacts({ onNav }) {
  const navFn = { onAbout: () => onNav('home'), onProjects: () => onNav('projects'), onContacts: () => onNav('contacts') };

  const rows = [
    { label: 'TELEGRAM', value: '@kristina_pr',          href: 'https://t.me/kristina_pr' },
    { label: 'EMAIL',    value: 'hi@proksion.ru',         href: 'mailto:hi@proksion.ru' },
    { label: 'BEHANCE',  value: 'behance.net/proksion',   href: 'https://behance.net/proksion' },
    { label: 'CV / PDF', value: 'Скачать резюме →',       href: '#' },
  ];

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', position: 'relative' }}>
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
          margin: '0 0 28px',
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--t-section-mob)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--fg-muted)',
          lineHeight: 0.95,
        }}>КОНТАК-<br />ТЫ</h1>

        {/* Availability note */}
        <p style={{
          margin: '0 0 36px',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--t-body-mob)',
          fontWeight: 700,
          lineHeight: 1.55,
          color: 'var(--fg)',
        }}>
          Открыта к проектным и full-time предложениям.
          Напишите по любому из каналов — обычно отвечаю в течение суток.
        </p>

        {/* Contact rows */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rows.map((r, i) => (
            <a
              key={r.label}
              href={r.href}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                padding: '20px 0',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                borderBottom: i === rows.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 12,
              }}>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--t-job-role-mob)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--fg-muted)',
                }}>{r.label}</span>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--t-chip-mob)',
                  fontWeight: 700,
                  textTransform: 'none',
                  letterSpacing: '0.02em',
                  color: 'var(--fg-strong)',
                  textAlign: 'right',
                }}>{r.value}</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      <MobileTabBar active="contacts" {...navFn} />
    </div>
  );
}

window.MobileContacts = MobileContacts;
