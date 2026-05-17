// TopNav — top bar shared across the site.
//   - PROKSION wordmark (left)  → goes home + scroll to top
//   - ОБО МНЕ / ПРОЕКТЫ / КОНТАКТЫ (centered)
//   - 2025 (right)
//   The active item gets the paper pill treatment (#e4e4e4 / 12px radius).

function TopNav({ route, onHome, onAbout, onProjects, large }) {
  const isAbout = route === 'home'; // the "home" route renders the about content
  const isProjects = route === 'projects';

  const items = [
    { id: 'about',    label: 'ОБО МНЕ',  active: isAbout,    onClick: onAbout },
    { id: 'projects', label: 'ПРОЕКТЫ',  active: isProjects, onClick: onProjects },
    { id: 'contacts', label: 'КОНТАКТЫ', active: false,      onClick: () => {} },
  ];

  return (
    <nav style={{
      position: 'absolute',
      left: 80, right: 80, top: 33,
      height: 92,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 50,
      fontFamily: 'Stengazeta, sans-serif',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      fontWeight: 700,
      fontSize: 40,
    }}>
      {/* Wordmark left — always shown in the bar (curtain is gone). */}
      <button onClick={onHome} style={{
        ...btnReset,
        color: '#a62323',
        fontFamily: 'Stengazeta, sans-serif',
        fontSize: 56,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        fontWeight: 700,
        lineHeight: 1,
      }}>PROKSION</button>

      {/* Center nav */}
      <ul style={{
        listStyle: 'none', margin: 0, padding: 0,
        display: 'flex', gap: 72, alignItems: 'center',
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      }}>
        {items.map(it => (
          <li key={it.id}>
            <button onClick={it.onClick} style={{
              ...btnReset,
              display: 'inline-block',
              background: it.active ? '#e4e4e4' : 'transparent',
              color: it.active ? '#141414' : '#bfbfbf',
              borderRadius: 12,
              padding: it.active ? '20px 38px 14px' : '20px 0 14px',
              transition: 'background 220ms cubic-bezier(.2,.7,.2,1), color 220ms cubic-bezier(.2,.7,.2,1)',
              fontSize: 40,
              fontFamily: 'inherit',
              textTransform: 'inherit',
              letterSpacing: 'inherit',
              fontWeight: 'inherit',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              lineHeight: 1,
            }}
            onMouseEnter={e => { if (!it.active) e.currentTarget.style.color = '#e4e4e4'; }}
            onMouseLeave={e => { if (!it.active) e.currentTarget.style.color = '#bfbfbf'; }}
            >{it.label}</button>
          </li>
        ))}
      </ul>

      <span style={{ color: '#bfbfbf', fontSize: 28 }}>2025</span>
    </nav>
  );
}

const btnReset = {
  background: 'transparent',
  border: 0,
  padding: 0,
  font: 'inherit',
  color: 'inherit',
  cursor: 'pointer',
  letterSpacing: 'inherit',
  textTransform: 'inherit',
};

window.TopNav = TopNav;
