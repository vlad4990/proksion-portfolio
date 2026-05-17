// MobileTabBar — fixed bottom navigation bar.
//   Three tabs: ОБО МНЕ / ПРОЕКТЫ / КОНТАКТЫ.
//   Active tab: red text + 3px red indicator bar pinned to top edge.
//   Inactive: --fg-muted (#bfbfbf).
//   Uses CSS env(safe-area-inset-bottom) for iPhone home indicator.

function MobileTabBar({ active, onAbout, onProjects, onContacts }) {
  const tabs = [
    { id: 'home',     label: 'ОБО МНЕ',  action: onAbout    },
    { id: 'projects', label: 'ПРОЕКТЫ',  action: onProjects },
    { id: 'contacts', label: 'КОНТАКТЫ', action: onContacts },
  ];

  return (
    <nav style={{
      position: 'fixed',
      left: 0, right: 0, bottom: 0,
      height: 'calc(var(--mob-tabbar) + env(safe-area-inset-bottom, 0px))',
      background: 'var(--bg)',
      borderTop: '1px solid rgba(255,255,255,0.10)',
      display: 'flex',
      zIndex: 200,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={t.action}
            style={{
              flex: 1,
              background: 'transparent',
              border: 0,
              padding: 0,
              cursor: 'pointer',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* Active indicator — red bar top edge */}
            {isActive && (
              <span style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 22,
                height: 3,
                background: 'var(--accent)',
                borderRadius: '0 0 2px 2px',
              }} />
            )}
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--t-tab-mob)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 700,
              color: isActive ? 'var(--accent)' : 'var(--fg-muted)',
              lineHeight: 1,
              transition: 'color var(--dur-base) var(--ease-out)',
            }}>
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

window.MobileTabBar = MobileTabBar;
