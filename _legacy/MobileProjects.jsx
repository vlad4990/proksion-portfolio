// MobileProjects — "ПРОЕКТЫ" page (mobile).
//   Fixed mini-header: PROKSION centered.
//   Horizontal scroll chips: category groups (Press F active by default).
//   Sub-chip: active sub-category with pixel-marker.
//   Vertical list of full-width project cards (images + placeholders).
//   Fixed bottom: MobileTabBar (active="projects").

function MobileProjects({ onNav }) {
  const navFn = { onAbout: () => onNav('home'), onProjects: () => onNav('projects'), onContacts: () => onNav('contacts') };

  const [activeGroup, setActiveGroup] = React.useState('pressf');
  const [activeSub, setActiveSub] = React.useState('vitriny');

  const groups = [
    { id: 'pressf',   label: 'Press F',    subs: [
      { id: 'banners', label: 'Баннера' },
      { id: 'vitriny', label: 'Витрины товаров' },
      { id: 'posts',   label: 'Посты в соц.сети' },
    ]},
    { id: 'kupikod',  label: 'KUPIKOD',    subs: [
      { id: 'k-ban', label: 'Баннера' },
      { id: 'k-yt',  label: 'YouTube обложки' },
    ]},
    { id: 'drawing',  label: 'Рисование', subs: [
      { id: 'd-paint', label: 'Живопись' },
      { id: 'd-draw',  label: 'Рисунок' },
      { id: 'd-dig',   label: 'Диджитал арт' },
    ]},
    { id: 'sketch',   label: 'Sketchbook', subs: [] },
    { id: 'uiux',     label: 'UI/UX',      subs: [] },
  ];

  const currentGroup = groups.find(g => g.id === activeGroup);

  // Project tiles: real images + tonal placeholders
  const tiles = [
    { image: 'assets/project-success.png', h: 240 },
    { color: '#3a3a3a', h: 160 },
    { image: 'assets/project-post.png',    h: 200 },
    { color: '#2e2e2e', h: 180 },
    { color: '#444',    h: 140 },
    { color: '#383838', h: 200 },
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
        paddingTop: 'calc(var(--mob-content-top) + 20px)',
        paddingBottom: 'calc(var(--mob-tabbar) + 24px)',
      }}>
        {/* Page title */}
        <h1 style={{
          margin: '0 0 18px',
          padding: '0 var(--mob-pad)',
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--t-section-mob)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--fg-muted)',
          lineHeight: 1,
        }}>ПРОЕКТЫ</h1>

        {/* Horizontal group chips */}
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '0 var(--mob-pad)',
          marginBottom: 14,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}>
          {groups.map(g => {
            const isActive = g.id === activeGroup;
            return (
              <button
                key={g.id}
                onClick={() => { setActiveGroup(g.id); setActiveSub(g.subs[0]?.id ?? null); }}
                style={{
                  flex: '0 0 auto',
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--t-chip-mob)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '9px 16px',
                  background: isActive ? 'var(--pill)' : 'transparent',
                  color: isActive ? 'var(--pill-fg)' : 'var(--fg-muted)',
                  border: isActive ? 'none' : '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 'var(--radius-tile)',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'background var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out)',
                }}
              >{g.label}</button>
            );
          })}
        </div>

        {/* Sub-category chips */}
        {currentGroup?.subs?.length > 0 && (
          <div style={{
            display: 'flex',
            gap: 8,
            padding: '0 var(--mob-pad)',
            marginBottom: 20,
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}>
            {currentGroup.subs.map(s => {
              const isActive = s.id === activeSub;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSub(s.id)}
                  style={{
                    flex: '0 0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'transparent',
                    border: 0,
                    padding: '4px 0',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {/* Pixel marker */}
                  <span style={{
                    width: 7, height: 8, flexShrink: 0,
                    clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
                    WebkitClipPath: 'polygon(0 0, 100% 50%, 0 100%)',
                    background: isActive ? 'var(--accent)' : 'transparent',
                  }} />
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--t-job-role-mob)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: isActive ? 'var(--fg-strong)' : 'var(--fg-muted)',
                    transition: 'color var(--dur-base) var(--ease-out)',
                  }}>{s.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Project tiles — full-width vertical list */}
        <div style={{
          padding: '0 var(--mob-pad)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {tiles.map((t, i) => (
            <div key={i} style={{
              width: '100%',
              height: t.h,
              background: t.image
                ? `url(${t.image}) center / cover no-repeat`
                : t.color,
              cursor: 'pointer',
              transition: 'transform var(--dur-base) var(--ease-out)',
            }}
            onTouchStart={e => e.currentTarget.style.opacity = '0.85'}
            onTouchEnd={e => e.currentTarget.style.opacity = '1'}
            />
          ))}
        </div>
      </div>

      <MobileTabBar active="projects" {...navFn} />
    </div>
  );
}

window.MobileProjects = MobileProjects;
