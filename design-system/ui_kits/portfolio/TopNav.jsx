// TopNav — single row used across all screens.
//   - PROKSION wordmark (left)
//   - 4 nav items (center, ALL CAPS)
//   - active item shown as paper-300 pill with 12px radius
//   - 2025 stamp (right)
//
// Source: Figma frames 1948755839 + 1948755973, top bar at left=80 top=33.

function TopNav({ active, onNav }) {
  const items = [
    { id: 'home',     label: 'PROKSION', kind: 'wordmark' },
    { id: 'about',    label: 'ОБО МНЕ' },
    { id: 'projects', label: 'ПРОЕКТЫ' },
    { id: 'contacts', label: 'КОНТАКТЫ' },
  ];

  return (
    <nav style={{
      position: 'absolute',
      left: 80, right: 80, top: 33,
      height: 59,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 10,
      fontFamily: 'Stengazeta, Oswald, sans-serif',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      fontWeight: 700,
      fontSize: 40,
    }}>
      <button onClick={() => onNav('home')} style={btnReset}>
        <span style={{ color: active === 'home' ? '#e4e4e4' : '#bfbfbf' }}>PROKSION</span>
      </button>

      <ul style={{
        listStyle: 'none', margin: 0, padding: 0,
        display: 'flex', gap: 84, alignItems: 'center',
      }}>
        {items.slice(1).map(it => {
          const isActive = active === it.id;
          return (
            <li key={it.id}>
              <button onClick={() => onNav(it.id)} style={{
                ...btnReset,
                display: 'inline-block',
                background: isActive ? '#e4e4e4' : 'transparent',
                color: isActive ? '#141414' : '#bfbfbf',
                borderRadius: 12,
                /* asymmetric padding compensates Stengazeta's tall descender region */
                padding: isActive ? '26px 44px 18px' : '26px 0 18px',
                transition: 'background 220ms cubic-bezier(.2,.7,.2,1), color 220ms cubic-bezier(.2,.7,.2,1)',
                fontSize: 40,
                fontFamily: 'inherit',
                textTransform: 'inherit',
                letterSpacing: 'inherit',
                fontWeight: 'inherit',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                lineHeight: 1,
              }}>{it.label}</button>
            </li>
          );
        })}
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
