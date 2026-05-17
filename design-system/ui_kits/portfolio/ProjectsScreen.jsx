// ProjectsScreen — node 251:4591 "Проекты" page
//   Left rail: collapsible category tree, current group rendered in red
//   with a small triangle marker, current child rendered as paper-300 pill.
//   Right area: ragged tile grid mixing square, wide and tall tiles
//   plus two real project thumbnails (KUPIKOD post + "successful release").

function SidebarGroup({ title, children, active, onClickGroup }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <button onClick={onClickGroup} style={{
        position: 'relative',
        display: 'block',
        background: 'transparent', border: 0,
        padding: 0,
        cursor: 'pointer',
        fontFamily: 'Stengazeta, Oswald, sans-serif', fontWeight: 700,
        fontSize: 52, lineHeight: 1,
        textTransform: 'uppercase', letterSpacing: '0.04em',
        color: active ? '#a62323' : '#bfbfbf',
        whiteSpace: 'nowrap',
        textAlign: 'left',
      }}>
        {active && (
          <img
            src="../../assets/icon-marker-pixel.svg"
            alt=""
            style={{
              position: 'absolute',
              left: -32,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 16, height: 19,
            }}
          />
        )}
        {title}
      </button>
      {active && (
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function SidebarChild({ label, active, onClick }) {
  // Sidebar sits at x=80. Children indent FURTHER right than their parent
  // group (text starts at +120px from sidebar left). Active row's background
  // still bleeds from the device's left edge (x=0) to the end of text.
  return (
    <button onClick={onClick} style={{
      alignSelf: 'stretch',
      width: active ? 'calc(100% + 80px)' : 'auto',
      marginLeft: active ? -80 : 0,
      textAlign: 'left',
      background: active ? '#e4e4e4' : 'transparent',
      color: active ? '#141414' : '#bfbfbf',
      border: 0,
      borderRadius: active ? '0 4px 4px 0' : 0,
      padding: active ? '10px 36px 10px 140px' : '8px 0 8px 60px',
      fontFamily: 'Stengazeta, Oswald, sans-serif',
      fontWeight: 700, fontSize: 32, lineHeight: 1,
      textTransform: 'uppercase', letterSpacing: '0.04em',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      transition: 'background 180ms cubic-bezier(.2,.7,.2,1), color 180ms cubic-bezier(.2,.7,.2,1)',
    }}>{label}</button>
  );
}

function ProjectsScreen({ onNav }) {
  const [active, setActive] = React.useState(['pressf', 'vitriny']); // [group, child]

  const groups = [
    { id: 'pressf', label: 'Press F', children: [
      { id: 'banners', label: 'Баннера' },
      { id: 'vitriny', label: 'Витрины товаров' },
      { id: 'posts', label: 'Посты в соц.сети' },
    ]},
    { id: 'kupikod', label: 'KUPIKOD', children: [
      { id: 'k-banners', label: 'Баннера' },
      { id: 'k-yt',      label: 'YouTube обложки' },
      { id: 'k-posts1',  label: 'Посты в соц.сети' },
      { id: 'k-posts2',  label: 'Посты в соц.сети' },
    ]},
    { id: 'drawing', label: 'Рисование', children: [
      { id: 'd-painting', label: 'Живопись' },
      { id: 'd-drawing',  label: 'Рисунок' },
      { id: 'd-digital',  label: 'Диджитал арт' },
    ]},
    { id: 'sketchbook', label: 'Sketchbook', children: [] },
    { id: 'uiux', label: 'UI/UX кейсы', children: [] },
  ];

  // Pinterest-style masonry. Heights are illustrative — real projects
  // would use their natural image aspect ratio.
  const tiles = [
    { h: 320, fill: '#d9d9d9' },
    { h: 240, fill: '#bfbfbf' },
    { h: 420, image: '../../assets/project-success.png' },
    { h: 280, fill: '#e4e4e4' },
    { h: 200, fill: '#c4c4c4' },
    { h: 360, fill: '#d9d9d9' },
    { h: 320, image: '../../assets/project-post.png' },
    { h: 180, fill: '#bfbfbf' },
    { h: 440, fill: '#e4e4e4' },
    { h: 260, fill: '#d9d9d9' },
    { h: 320, fill: '#c4c4c4' },
    { h: 220, fill: '#bfbfbf' },
    { h: 380, fill: '#d9d9d9' },
    { h: 200, fill: '#e4e4e4' },
    { h: 300, fill: '#c4c4c4' },
    { h: 240, fill: '#d9d9d9' },
  ];

  return (
    <div className="screen projects" data-screen-label="03 Projects">
      <TopNav active="projects" onNav={onNav} />

      {/* Sidebar — categories */}
      <div style={{
        position: 'absolute',
        left: 80, top: 196,
        width: 540,
      }}>
        {groups.map(g => (
          <SidebarGroup
            key={g.id}
            title={g.label}
            active={active[0] === g.id}
            onClickGroup={() => setActive([g.id, g.children[0]?.id ?? null])}
          >
            {g.children.map(c => (
              <SidebarChild
                key={c.id}
                label={c.label}
                active={active[1] === c.id}
                onClick={() => setActive([g.id, c.id])}
              />
            ))}
          </SidebarGroup>
        ))}
      </div>

      {/* Tile grid — Pinterest-style masonry via CSS columns */}
      <div style={{
        position: 'absolute',
        left: 675, top: 196,
        width: 1170,
        columnCount: 4,
        columnGap: 14,
      }}>
        {tiles.map((t, i) => (
          <div key={i} style={{
            display: 'block',
            width: '100%',
            height: t.h,
            marginBottom: 14,
            breakInside: 'avoid',
            background: t.image
              ? `url(${t.image}) center / cover no-repeat`
              : t.fill,
            cursor: 'pointer',
            transition: 'transform 180ms cubic-bezier(.2,.7,.2,1)',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          />
        ))}
      </div>
    </div>
  );
}

window.ProjectsScreen = ProjectsScreen;
