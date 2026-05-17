// HeroSection — 1920×1080 first-paint "curtain" panel.
//   Left half: PROKSION wordmark (red) + outlined "PORT/FOLIO" lockup
//   Right half: graphite #434145 column with masked portrait photo
//   The whole panel is wrapped by App in an overlay that dismisses on
//   user input — this component is purely visual.

function HeroSection() {
  return (
    <div
      className="screen home"
      data-screen-label="01 Home"
      style={{
        position: 'relative',
        width: 1920,
        height: 1080,
        background: '#141414',
        overflow: 'hidden',
      }}
    >
      {/* Right column — graphite panel with masked portrait */}
      <div style={{
        position: 'absolute',
        left: 904, top: 0,
        width: 1016, height: 1080,
        background: '#434145',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          left: -918, top: -141,
          width: 2273, height: 1832,
          transform: 'rotate(-3.6deg)',
          transformOrigin: '918px 141px',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(assets/photo-hero-portrait.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            WebkitMaskImage: 'url(assets/mask-hero.svg)',
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskImage: 'url(assets/mask-hero.svg)',
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
          }} />
        </div>
      </div>

      {/* PROKSION wordmark — large at hero, red */}
      <span style={{
        position: 'absolute', left: 82, top: 103,
        fontFamily: 'Stengazeta, sans-serif',
        fontWeight: 700,
        fontSize: 100,
        lineHeight: 1,
        color: '#a62323',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}>PROKSION</span>

      {/* "PORT / FOLIO" — outlined display block */}
      <div style={{
        position: 'absolute', left: 57, top: 280,
        width: 959,
        fontFamily: 'Stengazeta, sans-serif',
        fontWeight: 400,
        color: '#e4e4e4',
        WebkitTextStroke: '2.4px #000',
        textTransform: 'uppercase',
        lineHeight: 0.82,
        letterSpacing: '0.02em',
        pointerEvents: 'none',
      }}>
        <div style={{ fontSize: 380 }}>PORT</div>
        <div style={{ fontSize: 360, marginTop: -40 }}>FOLIO</div>
      </div>

      {/* Red pixel marker — small "enter" hint */}
      <img
        src="assets/icon-marker-pixel.svg"
        alt=""
        style={{
          position: 'absolute',
          left: 442, top: 992,
          width: 32, height: 38,
          transform: 'rotate(90deg)',
          animation: 'pkBob 1.6s ease-in-out infinite',
        }}
      />
    </div>
  );
}

window.HeroSection = HeroSection;
