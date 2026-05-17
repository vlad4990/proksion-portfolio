// MobileHero — full-viewport curtain (mobile).
//   Fills 100vw × 100vh with no scaling.
//   Top: PROKSION wordmark red at 44px.
//   Middle: outlined PORT / FOLIO lockup (144px).
//   Bottom half: graphite block with masked portrait photo.
//   Swipe hint at bottom edge. No tab bar — shown before navigation.

function MobileHero() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'var(--bg)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* PROKSION wordmark */}
      <div style={{
        position: 'absolute',
        top: 'calc(var(--mob-status) + 12px)',
        left: 'var(--mob-pad)',
        right: 'var(--mob-pad)',
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
      </div>

      {/* PORT / FOLIO outlined display */}
      <div style={{
        position: 'absolute',
        top: 'calc(var(--mob-status) + 72px)',
        left: 'var(--mob-pad)',
        right: 0,
        lineHeight: 0.88,
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--t-port-folio-mob)',
          fontWeight: 400,
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          color: 'var(--fg-strong)',
          WebkitTextStroke: '1.5px #000',
        }}>PORT</div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--t-port-folio-mob)',
          fontWeight: 400,
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          color: 'var(--fg-strong)',
          WebkitTextStroke: '1.5px #000',
          marginTop: -10,
        }}>FOLIO</div>
      </div>

      {/* Portrait — graphite block fills lower half */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0,
        top: 'calc(var(--mob-status) + 72px + 280px)',
        bottom: 60,
        background: 'var(--bg-panel)',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(assets/photo-hero-portrait.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          WebkitMaskImage: 'url(assets/mask-hero.svg)',
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskImage: 'url(assets/mask-hero.svg)',
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
        }} />
      </div>

      {/* Swipe hint */}
      <div style={{
        position: 'absolute',
        bottom: 28,
        left: 0, right: 0,
        textAlign: 'center',
        fontFamily: 'var(--font-body)',
        fontWeight: 700,
        fontSize: 'var(--t-small-mob)',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--fg-muted)',
      }}>
        ↑ свайп / нажми
      </div>
    </div>
  );
}

window.MobileHero = MobileHero;
