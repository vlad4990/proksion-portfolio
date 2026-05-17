// Mobile wireframe variants — Proksion portfolio
// 3 directions × 3 screens each. Mid-fidelity: real fonts/colors,
// simplified treatments + placeholder boxes for imagery.

const C = {
  bg: '#141414',
  ink900: '#0a0e15',
  graphite: '#434145',
  red: '#a62323',
  redDim: 'rgba(166,35,35,0.7)',
  paper: '#e4e4e4',
  body: '#bfbfbf',
  bodyStrong: '#c4c4c4',
};

// ─── Shared bits ────────────────────────────────────────────

function Burger({ color = '#e4e4e4' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 6 }}>
      <span style={{ width: 22, height: 2, background: color }}></span>
      <span style={{ width: 22, height: 2, background: color }}></span>
    </div>
  );
}

function Marker({ size = 12, rotate = 0 }) {
  // Tiny red pixel-marker primitive.
  return (
    <div style={{
      width: size, height: size * 1.2, position: 'relative',
      transform: `rotate(${rotate}deg)`,
    }}>
      <div style={{ position: 'absolute', inset: 0, background: C.red, clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}></div>
    </div>
  );
}

function MaskedPlaceholder({ tint = '#3a3a3a', label, h = 200 }) {
  // Hand-drawn-mask placeholder. Rough irregular shape via clip-path.
  const path = 'polygon(4% 8%, 22% 3%, 48% 6%, 72% 2%, 94% 7%, 97% 28%, 99% 56%, 96% 82%, 88% 96%, 60% 99%, 32% 97%, 8% 99%, 3% 78%, 6% 50%, 2% 24%)';
  return (
    <div style={{
      width: '100%', height: h,
      background: tint,
      clipPath: path,
      WebkitClipPath: path,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(228,228,228,0.45)', fontFamily: '-apple-system, sans-serif',
      fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
    }}>
      {label || 'photo'}
    </div>
  );
}

function Tile({ h = 90, tint = '#3a3a3a' }) {
  return <div style={{ width: '100%', height: h, background: tint }}></div>;
}

// ═══════════════════════════════════════════════════════════════
// VARIANT A — Минимальный стек
// ═══════════════════════════════════════════════════════════════

function VariantA_Hero() {
  return (
    <div style={{ background: C.bg, width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Hero on mobile has NO nav (curtain mode) */}
      <div style={{ position: 'absolute', top: 70, left: 20, right: 20 }}>
        <div className="stengazeta" style={{ color: C.red, fontSize: 44, lineHeight: 1 }}>PROKSION</div>
      </div>

      {/* Stacked PORT / FOLIO outlined */}
      <div style={{ position: 'absolute', top: 140, left: 20, right: 20, lineHeight: 0.88 }}>
        <div className="stengazeta" style={{
          fontSize: 144, color: C.paper,
          WebkitTextStroke: '1.5px #000',
        }}>PORT</div>
        <div className="stengazeta" style={{
          fontSize: 144, color: C.paper,
          WebkitTextStroke: '1.5px #000', marginTop: -10,
        }}>FOLIO</div>
      </div>

      {/* Portrait full width below */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 440, bottom: 80, background: C.graphite, overflow: 'hidden' }}>
        <MaskedPlaceholder tint="#665e55" label="portrait" h={320} />
      </div>

      {/* Tap hint */}
      <div style={{ position: 'absolute', bottom: 50, left: 0, right: 0, textAlign: 'center', color: C.body, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
        ↑ свайп / нажми
      </div>
    </div>
  );
}

function VariantA_Nav({ active }) {
  return (
    <div style={{
      position: 'absolute', top: 56, left: 0, right: 0, height: 52,
      background: C.bg, borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 18px', zIndex: 5,
    }}>
      <div className="stengazeta" style={{ color: C.red, fontSize: 22 }}>PROKSION</div>
      <Burger />
    </div>
  );
}

function VariantA_About() {
  return (
    <div style={{ background: C.bg, width: '100%', height: '100%', position: 'relative', overflow: 'hidden', paddingTop: 108, paddingBottom: 40 }}>
      <VariantA_Nav active="about" />
      <div style={{ padding: '0 20px' }}>
        {/* Section badge */}
        <div className="stengazeta" style={{ color: C.body, fontSize: 38, lineHeight: 1, marginBottom: 18 }}>
          ОБО МНЕ
        </div>

        {/* Photo above text */}
        <div style={{ marginBottom: 22 }}>
          <MaskedPlaceholder tint="#5a4d42" h={180} label="photo · about" />
        </div>

        {/* Intro */}
        <p style={{ margin: 0, color: C.bodyStrong, fontSize: 14, lineHeight: 1.45 }}>
          С детства я рисую, играю в компьютер, занимаюсь музыкой и полностью погружена в творчество по сей день.
        </p>

        {/* Experience header */}
        <div className="stengazeta" style={{ color: C.body, fontSize: 32, lineHeight: 1, marginTop: 28, marginBottom: 14 }}>
          Опыт работы
        </div>

        {/* Job 1 */}
        <div style={{ marginBottom: 18 }}>
          <div className="stengazeta" style={{ fontSize: 17, lineHeight: 1.1, marginBottom: 4 }}>
            <span style={{ color: C.red }}>LOFTY.</span>
            <span style={{ color: C.body }}> · 1.5 года</span>
          </div>
          <div className="stengazeta" style={{ color: C.body, fontSize: 14, marginBottom: 8 }}>Графический дизайнер</div>
          <div style={{ color: C.body, fontSize: 12, lineHeight: 1.5 }}>
            Креативы, баннеры, SMM. Фирменный стиль и коммуникация с маркетингом.
          </div>
        </div>

        {/* Job 2 - dim */}
        <div style={{ marginBottom: 18 }}>
          <div className="stengazeta" style={{ fontSize: 17, lineHeight: 1.1, marginBottom: 4 }}>
            <span style={{ color: C.redDim }}>КОПИРКА</span>
            <span style={{ color: C.body }}> · 6 месяцев</span>
          </div>
          <div className="stengazeta" style={{ color: C.body, fontSize: 14, marginBottom: 8 }}>Графический дизайнер</div>
          <div style={{ color: C.body, fontSize: 12, lineHeight: 1.5 }}>
            Дизайн и верстка сувенирной и полиграфической продукции…
          </div>
        </div>

        {/* Education */}
        <div className="stengazeta" style={{ color: C.body, fontSize: 32, lineHeight: 1, marginTop: 14, marginBottom: 14 }}>
          Образование
        </div>
        <div style={{ color: C.body, fontSize: 12 }}>Художник-мастер, педагог</div>
      </div>
    </div>
  );
}

function VariantA_Projects() {
  const cats = [
    { id: 'pressf', label: 'Press F', open: true, children: ['Баннера', 'Витрины товаров', 'Посты в соц.сети'] },
    { id: 'kupikod', label: 'KUPIKOD' },
    { id: 'draw', label: 'Рисование' },
    { id: 'sk', label: 'Sketchbook' },
    { id: 'uiux', label: 'UI/UX кейсы' },
  ];
  return (
    <div style={{ background: C.bg, width: '100%', height: '100%', position: 'relative', overflow: 'hidden', paddingTop: 108, paddingBottom: 40 }}>
      <VariantA_Nav active="projects" />
      <div style={{ padding: '0 20px' }}>
        <div className="stengazeta" style={{ color: C.body, fontSize: 38, lineHeight: 1, marginBottom: 16 }}>
          ПРОЕКТЫ
        </div>

        {/* Accordion */}
        <div style={{ marginBottom: 18 }}>
          {cats.map((c) => (
            <div key={c.id} style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '12px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="stengazeta" style={{ color: c.open ? C.red : C.body, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {c.open && <Marker size={8} />}
                  {c.label}
                </div>
                <span style={{ color: C.body, fontSize: 14 }}>{c.open ? '–' : '+'}</span>
              </div>
              {c.open && c.children && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10, paddingLeft: 18 }}>
                  {c.children.map((ch, i) => (
                    <div key={i} className="stengazeta" style={{
                      color: i === 1 ? C.bg : C.body,
                      background: i === 1 ? C.paper : 'transparent',
                      padding: i === 1 ? '6px 10px' : '4px 0',
                      borderRadius: 2,
                      fontSize: 14,
                      display: 'inline-block',
                      alignSelf: 'flex-start',
                    }}>{ch}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 2-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Tile h={130} tint="#d9d9d9" />
          <Tile h={90}  tint="#bfbfbf" />
          <Tile h={160} tint="#c4c4c4" />
          <Tile h={120} tint="#e4e4e4" />
          <Tile h={100} tint="#d9d9d9" />
          <Tile h={140} tint="#bfbfbf" />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// VARIANT B — Редакционный фуллскрин
// ═══════════════════════════════════════════════════════════════

function VariantB_Hero() {
  return (
    <div style={{ background: C.bg, width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Just status bar territory */}
      <div style={{ position: 'absolute', top: 70, left: 20, right: 20 }}>
        <div className="stengazeta" style={{ color: C.red, fontSize: 36, lineHeight: 1 }}>PROKSION</div>
      </div>

      {/* Portrait fills bulk of screen */}
      <div style={{ position: 'absolute', top: 130, left: 0, right: 0, bottom: 200, background: C.graphite, overflow: 'hidden' }}>
        <MaskedPlaceholder tint="#5a5048" label="portrait full-bleed" h={520} />
      </div>

      {/* PORT FOLIO bottom */}
      <div style={{ position: 'absolute', bottom: 90, left: 20, right: 20, lineHeight: 0.88 }}>
        <div className="stengazeta" style={{ fontSize: 78, color: C.paper, WebkitTextStroke: '1.2px #000' }}>PORT</div>
        <div className="stengazeta" style={{ fontSize: 78, color: C.paper, WebkitTextStroke: '1.2px #000', marginTop: -6 }}>FOLIO</div>
      </div>

      {/* Pagination dots */}
      <div style={{ position: 'absolute', bottom: 50, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: 99, background: C.red }}></span>
        <span style={{ width: 6, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.18)' }}></span>
        <span style={{ width: 6, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.18)' }}></span>
      </div>
    </div>
  );
}

function VariantB_About() {
  // Paginated: showing card 2/3 — experience
  return (
    <div style={{ background: C.bg, width: '100%', height: '100%', position: 'relative', overflow: 'hidden', paddingTop: 70, paddingBottom: 40 }}>
      {/* Top: brand + dots */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 18px' }}>
        <div className="stengazeta" style={{ color: C.red, fontSize: 22 }}>PROKSION</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <span style={{ width: 16, height: 2, background: 'rgba(255,255,255,0.18)' }}></span>
          <span style={{ width: 16, height: 2, background: C.paper }}></span>
          <span style={{ width: 16, height: 2, background: 'rgba(255,255,255,0.18)' }}></span>
        </div>
      </div>

      <div style={{ padding: '0 24px' }}>
        {/* Page label */}
        <div style={{ color: C.body, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>02 / 03 · Опыт</div>

        <div className="stengazeta" style={{ color: C.body, fontSize: 56, lineHeight: 0.95, marginBottom: 30 }}>
          ОПЫТ<br/>РАБОТЫ
        </div>

        {/* Single job foregrounded */}
        <div className="stengazeta" style={{ color: C.red, fontSize: 26, lineHeight: 1 }}>LOFTY.</div>
        <div className="stengazeta" style={{ color: C.body, fontSize: 16, marginTop: 4 }}>Графический дизайнер · 1.5 года</div>

        <div style={{ marginTop: 18, color: C.bodyStrong, fontSize: 13, lineHeight: 1.55 }}>
          Креативы, баннеры, SMM-посты. Фирменный стиль. Подготовка материалов на сайт, работа с UI-kit, общение с разработчиками. Точечное внедрение ИИ.
        </div>

        {/* Mini prev card peeking */}
        <div style={{ position: 'absolute', bottom: 60, left: 24, right: 24, padding: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 4 }}>
          <div className="stengazeta" style={{ color: C.redDim, fontSize: 14 }}>КОПИРКА</div>
          <div style={{ color: C.body, fontSize: 11, marginTop: 2 }}>Дизайнер · 6 мес.   →</div>
        </div>
      </div>
    </div>
  );
}

function VariantB_Projects() {
  return (
    <div style={{ background: C.bg, width: '100%', height: '100%', position: 'relative', overflow: 'hidden', paddingTop: 70, paddingBottom: 40 }}>
      {/* Top: brand + burger */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 16px' }}>
        <div className="stengazeta" style={{ color: C.red, fontSize: 22 }}>PROKSION</div>
        <Burger />
      </div>

      <div className="stengazeta" style={{ color: C.body, fontSize: 40, lineHeight: 1, padding: '0 20px', marginBottom: 14 }}>
        ПРОЕКТЫ
      </div>

      {/* Horizontal scroll chips */}
      <div style={{ overflowX: 'auto', display: 'flex', gap: 8, padding: '0 20px', marginBottom: 18 }}>
        {[
          { l: 'Press F', active: true },
          { l: 'KUPIKOD' },
          { l: 'Рисование' },
          { l: 'Sketchbook' },
          { l: 'UI/UX' },
        ].map((c) => (
          <div key={c.l} className="stengazeta" style={{
            flex: '0 0 auto',
            padding: '8px 14px',
            background: c.active ? C.paper : 'transparent',
            color: c.active ? C.bg : C.body,
            border: c.active ? 'none' : '1px solid rgba(255,255,255,0.15)',
            borderRadius: 2,
            fontSize: 14,
            whiteSpace: 'nowrap',
          }}>{c.l}</div>
        ))}
      </div>

      {/* Sub-chip */}
      <div style={{ padding: '0 20px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Marker size={8} />
          <div className="stengazeta" style={{ color: C.body, fontSize: 13 }}>Витрины товаров</div>
        </div>
      </div>

      {/* Full-width project cards */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Tile h={220} tint="#c4c4c4" />
        <Tile h={140} tint="#d9d9d9" />
        <Tile h={180} tint="#bfbfbf" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// VARIANT C — Типографический плакат
// ═══════════════════════════════════════════════════════════════

function VariantC_Hero() {
  return (
    <div style={{ background: C.bg, width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Massive PROKSION cut by status bar */}
      <div style={{ position: 'absolute', top: 28, left: -8, right: -8, overflow: 'hidden' }}>
        <div className="stengazeta" style={{
          color: C.red, fontSize: 80, lineHeight: 0.85, letterSpacing: '0.02em',
        }}>PROK<br/>SION</div>
      </div>

      {/* Portrait extends to viewport bottom */}
      <div style={{ position: 'absolute', top: 200, left: 0, right: 0, bottom: 0, background: C.graphite }}>
        <MaskedPlaceholder tint="#6a5a4c" label="portrait — bleeds out" h={500} />
      </div>

      {/* PORTFOLIO overlapping the image edge */}
      <div style={{ position: 'absolute', top: 240, left: -20, right: -20, lineHeight: 0.82 }}>
        <div className="stengazeta" style={{ fontSize: 110, color: C.paper, WebkitTextStroke: '1.5px #000', whiteSpace: 'nowrap' }}>PORTFOLIO</div>
      </div>

      {/* Three pixel-markers stacked at bottom-left */}
      <div style={{ position: 'absolute', bottom: 60, left: 24, display: 'flex', gap: 4 }}>
        <Marker rotate={90} size={10} />
        <Marker rotate={90} size={10} />
        <Marker rotate={90} size={10} />
      </div>
    </div>
  );
}

function VariantC_About() {
  return (
    <div style={{ background: C.bg, width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Minimal top */}
      <div style={{ position: 'absolute', top: 60, left: 18, right: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="stengazeta" style={{ color: C.red, fontSize: 18 }}>PROKSION</div>
        <div style={{ color: C.body, fontSize: 11, letterSpacing: '0.18em' }}>2025</div>
      </div>

      {/* HUGE title overflowing right */}
      <div style={{ position: 'absolute', top: 110, left: 18, right: -40, lineHeight: 0.88 }}>
        <div className="stengazeta" style={{ fontSize: 88, color: C.body, whiteSpace: 'nowrap' }}>ОБО</div>
        <div className="stengazeta" style={{ fontSize: 88, color: C.body, whiteSpace: 'nowrap', marginTop: -8 }}>МНЕ.</div>
      </div>

      {/* Body cut by photo */}
      <div style={{ position: 'absolute', top: 310, left: 18, right: 18, color: C.bodyStrong, fontSize: 13, lineHeight: 1.45 }}>
        С детства я рисую, играю в компьютер, занимаюсь музыкой —
      </div>

      {/* Photo breaking the column */}
      <div style={{ position: 'absolute', top: 370, left: -10, width: 220, height: 200 }}>
        <MaskedPlaceholder tint="#5a4d42" h={200} label="photo" />
      </div>

      {/* Year mark + small experience callout */}
      <div style={{ position: 'absolute', top: 430, right: 18, textAlign: 'right' }}>
        <div className="stengazeta" style={{ color: C.red, fontSize: 32, lineHeight: 1 }}>LOFTY.</div>
        <div style={{ color: C.body, fontSize: 11, marginTop: 4 }}>1.5 года · gd</div>
      </div>

      {/* Bottom marker rail */}
      <div style={{ position: 'absolute', bottom: 50, left: 18, right: 18, borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 14, display: 'flex', justifyContent: 'space-between' }}>
        <div className="stengazeta" style={{ color: C.body, fontSize: 11 }}>СКРОЛЛ ↓</div>
        <div className="stengazeta" style={{ color: C.body, fontSize: 11 }}>01 / 03</div>
      </div>
    </div>
  );
}

function VariantC_Projects() {
  return (
    <div style={{ background: C.bg, width: '100%', height: '100%', position: 'relative', overflow: 'hidden', paddingTop: 60 }}>
      {/* Top brand */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 18px 14px' }}>
        <div className="stengazeta" style={{ color: C.red, fontSize: 18 }}>PROKSION</div>
        <div style={{ color: C.body, fontSize: 11 }}>17 проектов</div>
      </div>

      {/* Huge category title */}
      <div className="stengazeta" style={{ fontSize: 64, color: C.red, lineHeight: 0.88, padding: '0 18px', marginBottom: 16 }}>
        PRESS F<br/>
        <span style={{ color: C.body, fontSize: 28 }}>↓ ВИТРИНЫ</span>
      </div>

      {/* Single-column tall poster cards */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'relative', height: 280, background: '#3a3530', overflow: 'hidden' }}>
          <Tile h={280} tint="#3a3530" />
          <div className="stengazeta" style={{ position: 'absolute', bottom: 16, left: 18, right: 18, color: C.paper, fontSize: 32, lineHeight: 0.95 }}>
            УСПЕШНЫЙ<br/>РЕЛИЗ
          </div>
        </div>
        <div style={{ position: 'relative', height: 240, background: '#4a3530' }}>
          <Tile h={240} tint="#4a3530" />
          <div className="stengazeta" style={{ position: 'absolute', bottom: 16, left: 18, color: C.paper, fontSize: 28 }}>
            ВЕЧЕРНЯЯ<br/>ДУРКА
          </div>
        </div>
      </div>

      {/* Bottom tab bar — mobile native category switcher */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 76,
        background: '#0a0a0a',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        padding: '0 6px 18px',
      }}>
        {['PRESS F', 'KUPIKOD', 'РИСУЮ', 'SK.', 'UI/UX'].map((l, i) => (
          <div key={l} className="stengazeta" style={{
            fontSize: 10, color: i === 0 ? C.red : C.body,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            {i === 0 && <Marker size={6} />}
            {!(i === 0) && <span style={{ width: 6, height: 6 }}></span>}
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

// expose
Object.assign(window, {
  VariantA_Hero, VariantA_About, VariantA_Projects,
  VariantB_Hero, VariantB_About, VariantB_Projects,
  VariantC_Hero, VariantC_About, VariantC_Projects,
});
