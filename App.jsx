// App — Proksion portfolio
//   Detects mobile (≤768px) and renders the mobile component tree;
//   on desktop keeps the 1920-px scaled stage with TopNav.
//
//   Routes: 'home' | 'projects' | 'contacts'
//   Hero phase: 'visible' | 'dismissing' | 'gone'

function useIsMobile() {
  const [mob, setMob] = React.useState(() => window.innerWidth <= 768);
  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const h = (e) => setMob(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return mob;
}

function smoothScrollTo(target, duration = 600) {
  const start = window.scrollY;
  const change = target - start;
  if (Math.abs(change) < 2) return;
  const t0 = performance.now();
  const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  function step(now) {
    const t = Math.min(1, (now - t0) / duration);
    window.scrollTo(0, start + change * ease(t));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function App() {
  const isMobile = useIsMobile();

  const [heroPhase, setHeroPhase] = React.useState('visible');
  const [route, setRoute] = React.useState(() =>
    localStorage.getItem('proksion:route') || 'home'
  );
  React.useEffect(() => { localStorage.setItem('proksion:route', route); }, [route]);

  const dismissHero = React.useCallback(() => {
    setHeroPhase(p => p === 'visible' ? 'dismissing' : p);
  }, []);
  React.useEffect(() => {
    if (heroPhase !== 'dismissing') return;
    const t = setTimeout(() => setHeroPhase('gone'), 600);
    return () => clearTimeout(t);
  }, [heroPhase]);

  // Lock scroll while hero is up
  React.useEffect(() => {
    document.documentElement.style.overflow = heroPhase === 'gone' ? '' : 'hidden';
    return () => { document.documentElement.style.overflow = ''; };
  }, [heroPhase]);

  // Any input dismisses the curtain
  React.useEffect(() => {
    if (heroPhase !== 'visible') return;
    const h = () => dismissHero();
    window.addEventListener('wheel',      h, { passive: true, once: true });
    window.addEventListener('touchstart', h, { passive: true, once: true });
    window.addEventListener('keydown',    h, { once: true });
    return () => {
      window.removeEventListener('wheel',      h);
      window.removeEventListener('touchstart', h);
      window.removeEventListener('keydown',    h);
    };
  }, [heroPhase, dismissHero]);

  const navigate = (r) => {
    setRoute(r);
    requestAnimationFrame(() => window.scrollTo(0, 0));
  };

  // ── Mobile tree ───────────────────────────────────────────
  if (isMobile) {
    return (
      <React.Fragment>
        {/* Hero curtain */}
        {heroPhase !== 'gone' && (
          <div
            className={`hero-overlay${heroPhase === 'dismissing' ? ' dismissing' : ''}`}
            onClick={dismissHero}
            role="button"
            aria-label="Войти на сайт"
          >
            <MobileHero />
          </div>
        )}

        {/* Main mobile app */}
        {heroPhase === 'gone' && (
          <React.Fragment>
            {route === 'home'     && <MobileAbout    onNav={navigate} />}
            {route === 'projects' && <MobileProjects onNav={navigate} />}
            {route === 'contacts' && <MobileContacts onNav={navigate} />}
          </React.Fragment>
        )}
      </React.Fragment>
    );
  }

  // ── Desktop tree ──────────────────────────────────────────
  const showNav = heroPhase === 'gone';
  const onHome     = () => { setRoute('home');     requestAnimationFrame(() => smoothScrollTo(0)); };
  const onAbout    = () => onHome();
  const onProjects = () => { setRoute('projects'); requestAnimationFrame(() => window.scrollTo(0, 0)); };

  return (
    <React.Fragment>
      {heroPhase !== 'gone' && (
        <div
          className={`hero-overlay${heroPhase === 'dismissing' ? ' dismissing' : ''}`}
          onClick={dismissHero}
          role="button"
          aria-label="Войти на сайт"
        >
          <div className="hero-fit">
            <HeroSection />
          </div>
        </div>
      )}

      <div className="nav-host" style={{ display: showNav ? 'block' : 'none' }}>
        <TopNav route={route} onHome={onHome} onAbout={onAbout} onProjects={onProjects} />
      </div>

      <div className="stage-wrap">
        <div className="stage">
          {route === 'home'     && <AboutSection />}
          {route === 'projects' && <ProjectsScreen />}
        </div>
      </div>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
