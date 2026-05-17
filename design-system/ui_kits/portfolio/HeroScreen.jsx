// HeroScreen — node 171:5296
//   Black canvas, left half holds the wordmark + a stacked outlined
//   "Port / folio" display word, right half is a graphite #434145 column
//   with a portrait photo masked through a rough hand-drawn vector shape.

function HeroScreen({ onNav }) {
  return (
    <div className="screen home" data-screen-label="01 Home">
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
            backgroundImage: 'url(../../assets/photo-hero-portrait.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            WebkitMaskImage: 'url(../../assets/mask-hero.svg)',
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskImage: 'url(../../assets/mask-hero.svg)',
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
          }} />
        </div>
      </div>

      <TopNav active="home" onNav={onNav} />

      {/* PROKSION wordmark — large at hero, red */}
      <span style={{
        position: 'absolute', left: 82, top: 200,
        fontFamily: 'Stengazeta, Oswald, sans-serif',
        fontWeight: 700,
        fontSize: 100,
        lineHeight: 1,
        color: '#a62323',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}>PROKSION</span>

      {/* "PORT / FOLIO" — outlined display block */}
      <div style={{
        position: 'absolute', left: 57, top: 320,
        width: 959,
        fontFamily: '"Stengazeta", "Black Ops One", sans-serif',
        fontWeight: 400,
        color: '#e4e4e4',
        WebkitTextStroke: '2.4px #000',
        textTransform: 'uppercase',
        lineHeight: 0.82,
        letterSpacing: '0.02em',
      }}>
        <div style={{ fontSize: 380 }}>PORT</div>
        <div style={{ fontSize: 360, marginTop: -40 }}>FOLIO</div>
      </div>

      {/* Red pixel marker at bottom-left of left column */}
      <img src="../../assets/icon-marker-pixel.svg"
        alt=""
        style={{
          position: 'absolute',
          left: 442, top: 992,
          width: 32, height: 38,
          transform: 'rotate(90deg)',
        }} />
    </div>
  );
}

window.HeroScreen = HeroScreen;
