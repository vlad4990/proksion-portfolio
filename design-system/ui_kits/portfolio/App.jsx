// App — routes between the three Figma frames as separate screens.

function App() {
  // route persists across reloads so the UI kit is comfortable to iterate
  const [route, setRoute] = React.useState(() => {
    return localStorage.getItem('proksion:route') || 'home';
  });
  React.useEffect(() => { localStorage.setItem('proksion:route', route); }, [route]);

  const onNav = (id) => {
    if (id === 'contacts') return; // not in Figma; no-op
    setRoute(id);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div className="stage">
      {route === 'home'     && <HeroScreen     onNav={onNav} />}
      {route === 'about'    && <AboutScreen    onNav={onNav} />}
      {route === 'projects' && <ProjectsScreen onNav={onNav} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
