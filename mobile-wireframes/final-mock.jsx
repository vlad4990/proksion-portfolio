// Final mobile direction — A · Hero (curtain) + A · About + B · Projects
// plus a new КОНТАКТЫ screen. Navigation between the three main views is
// done via a bottom tab bar in brand DNA: solid black, Stengazeta caps,
// red pixel-marker as the active indicator. No SaaS-y icons.

const FM = {
  bg: '#141414',
  ink900: '#0a0e15',
  graphite: '#434145',
  red: '#a62323',
  redDim: 'rgba(166,35,35,0.7)',
  paper: '#e4e4e4',
  body: '#bfbfbf',
  bodyStrong: '#c4c4c4',
};

// ─── Reusable bottom tab bar ────────────────────────────────────

// Brand-appropriate icons in stroke style — the design system has no
// icon set, so these are drawn from primitive shapes that fit the
// editorial/brutalist DNA (head silhouette, 2×2 grid of squares,
// envelope). Active state colors the stroke red.

function IconAbout({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="8" r="3.6" stroke={color} strokeWidth="2"/>
      <path d="M3.5 19.5c1.6-3.6 4.4-5.4 7.5-5.4s5.9 1.8 7.5 5.4" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconProjects({ color }) {
  // 2×2 grid of solid squares — literal "projects" representation
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2"  y="2"  width="8" height="8" fill={color}/>
      <rect x="12" y="2"  width="8" height="8" fill={color}/>
      <rect x="2"  y="12" width="8" height="8" fill={color}/>
      <rect x="12" y="12" width="8" height="8" fill={color}/>
    </svg>
  );
}

function IconContacts({ color }) {
  // Envelope-style block
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="5" width="18" height="13" stroke={color} strokeWidth="2"/>
      <path d="M2.5 6l8.5 7 8.5-7" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  );
}

function TabBar({ active = 'about' }) {
  const tabs = [
    { id: 'about',    label: 'ОБО МНЕ' },
    { id: 'projects', label: 'ПРОЕКТЫ' },
    { id: 'contacts', label: 'КОНТАКТЫ' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      height: 64,
      background: FM.bg,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'stretch',
      paddingBottom: 22,           // room for the iOS home indicator
      zIndex: 30,
    }}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        const color = isActive ? FM.red : FM.body;
        return (
          <div key={t.id} style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {/* Active marker — short red bar pinned to the top edge */}
            {isActive && (
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 22, height: 3, background: FM.red,
              }}></div>
            )}
            <div className="stengazeta" style={{
              fontSize: 15,
              color,
              letterSpacing: '0.06em',
              lineHeight: 1,
            }}>{t.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Hero (curtain — no tab bar yet) ───────────────────────────

function FM_Hero() {
  return (
    <div style={{ background: FM.bg, width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* No tab bar, no nav — pure curtain */}

      <div style={{ position: 'absolute', top: 70, left: 20, right: 20 }}>
        <div className="stengazeta" style={{ color: FM.red, fontSize: 44, lineHeight: 1 }}>PROKSION</div>
      </div>

      <div style={{ position: 'absolute', top: 140, left: 20, right: 20, lineHeight: 0.88 }}>
        <div className="stengazeta" style={{
          fontSize: 144, color: FM.paper,
          WebkitTextStroke: '1.5px #000',
        }}>PORT</div>
        <div className="stengazeta" style={{
          fontSize: 144, color: FM.paper,
          WebkitTextStroke: '1.5px #000', marginTop: -10,
        }}>FOLIO</div>
      </div>

      <div style={{
        position: 'absolute', left: 0, right: 0,
        top: 440, bottom: 70,
        background: FM.graphite, overflow: 'hidden',
      }}>
        <MaskedPlaceholder tint="#665e55" label="portrait" h={340} />
      </div>

      <div style={{
        position: 'absolute', bottom: 40, left: 0, right: 0,
        textAlign: 'center', color: FM.body, fontSize: 11,
        letterSpacing: '0.2em', textTransform: 'uppercase',
      }}>
        ↑ свайп / нажми
      </div>
    </div>
  );
}

// ─── Обо мне (active tab) ─────────────────────────────────────

function FM_AboutHeader() {
  return (
    <div style={{
      position: 'absolute', top: 56, left: 0, right: 0,
      height: 56, background: FM.bg,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 18px', zIndex: 5,
    }}>
      <div className="stengazeta" style={{ color: FM.red, fontSize: 24, letterSpacing: '0.04em' }}>PROKSION</div>
    </div>
  );
}

function FM_About() {
  return (
    <div style={{ background: FM.bg, width: '100%', height: '100%', position: 'relative', overflow: 'hidden', paddingTop: 112, paddingBottom: 76, boxSizing: 'border-box' }}>
      <FM_AboutHeader />

      <div style={{ padding: '0 22px', overflow: 'auto', height: '100%' }}>
        <div className="stengazeta" style={{ color: FM.body, fontSize: 44, lineHeight: 0.95, marginBottom: 22 }}>
          ОБО<br/>МНЕ
        </div>

        <div style={{ marginBottom: 22 }}>
          <MaskedPlaceholder tint="#5a4d42" h={170} label="photo · about" />
        </div>

        <p style={{ margin: 0, color: FM.bodyStrong, fontSize: 14, lineHeight: 1.5 }}>
          С детства я рисую, играю в компьютер, занимаюсь музыкой и
          полностью погружена в творчество по сей день — комиксы, фильмы,
          путешествия, скетчбук.
        </p>

        <div className="stengazeta" style={{ color: FM.body, fontSize: 30, lineHeight: 1, marginTop: 32, marginBottom: 16 }}>
          Опыт работы
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="stengazeta" style={{ fontSize: 17, lineHeight: 1.15, marginBottom: 4 }}>
            <span style={{ color: FM.red }}>LOFTY.</span>
            <span style={{ color: FM.body }}> · 1.5 года</span>
          </div>
          <div className="stengazeta" style={{ color: FM.body, fontSize: 13, marginBottom: 8 }}>Графический дизайнер</div>
          <div style={{ color: FM.body, fontSize: 12, lineHeight: 1.5 }}>
            Креативы, баннеры, SMM-посты. Фирменный стиль. UI-kit, ивенты на сайт. Внедрение ИИ.
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="stengazeta" style={{ fontSize: 17, lineHeight: 1.15, marginBottom: 4 }}>
            <span style={{ color: FM.redDim }}>КОПИРКА</span>
            <span style={{ color: FM.body }}> · 6 месяцев</span>
          </div>
          <div className="stengazeta" style={{ color: FM.body, fontSize: 13, marginBottom: 8 }}>Графический дизайнер</div>
          <div style={{ color: FM.body, fontSize: 12, lineHeight: 1.5 }}>
            Сувенирная и полиграфическая продукция, ретушь, печать, визитки.
          </div>
        </div>

        <div className="stengazeta" style={{ color: FM.body, fontSize: 30, lineHeight: 1, marginTop: 14, marginBottom: 14 }}>
          Образование
        </div>

        <div className="stengazeta" style={{ color: FM.body, fontSize: 14, marginBottom: 4 }}>Художник-мастер, педагог</div>
        <div style={{ color: FM.body, fontSize: 11, marginBottom: 14 }}>Колледж декоративно-прикладного искусства им. Карла Фаберже</div>

        <div className="stengazeta" style={{ color: FM.body, fontSize: 14, marginBottom: 4 }}>Монументальная живопись</div>
        <div style={{ color: FM.body, fontSize: 11 }}>РГУ им. А.Н. Косыгина, Институт искусств</div>
      </div>

      <TabBar active="about" />
    </div>
  );
}

// ─── Проекты (variant B treatment + bottom tab bar) ───────────

function FM_Projects() {
  return (
    <div style={{ background: FM.bg, width: '100%', height: '100%', position: 'relative', overflow: 'hidden', paddingTop: 112, paddingBottom: 76, boxSizing: 'border-box' }}>
      <FM_AboutHeader />

      <div style={{ height: '100%', overflow: 'auto' }}>
        <div className="stengazeta" style={{ color: FM.body, fontSize: 40, lineHeight: 1, padding: '0 22px', marginBottom: 16 }}>
          ПРОЕКТЫ
        </div>

        {/* Horizontal scroll chips */}
        <div style={{ overflowX: 'auto', display: 'flex', gap: 8, padding: '0 22px', marginBottom: 16, whiteSpace: 'nowrap' }}>
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
              background: c.active ? FM.paper : 'transparent',
              color: c.active ? FM.bg : FM.body,
              border: c.active ? 'none' : '1px solid rgba(255,255,255,0.15)',
              borderRadius: 2,
              fontSize: 14,
            }}>{c.l}</div>
          ))}
        </div>

        {/* Sub-chip */}
        <div style={{ padding: '0 22px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 9, clipPath: 'polygon(0 0, 100% 50%, 0 100%)', background: FM.red }}></div>
          <div className="stengazeta" style={{ color: FM.body, fontSize: 13 }}>Витрины товаров</div>
        </div>

        {/* Full-width project cards */}
        <div style={{ padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Tile h={220} tint="#c4c4c4" />
          <Tile h={140} tint="#d9d9d9" />
          <Tile h={180} tint="#bfbfbf" />
          <Tile h={160} tint="#c4c4c4" />
        </div>
      </div>

      <TabBar active="projects" />
    </div>
  );
}

// ─── Контакты (new) ──────────────────────────────────────────

function FM_Contacts() {
  const rows = [
    { label: 'TELEGRAM', value: '@kristina_pr' },
    { label: 'EMAIL',    value: 'hi@proksion.ru' },
    { label: 'BEHANCE',  value: 'behance.net/proksion' },
    { label: 'CV / PDF', value: 'скачать резюме →' },
  ];
  return (
    <div style={{ background: FM.bg, width: '100%', height: '100%', position: 'relative', overflow: 'hidden', paddingTop: 112, paddingBottom: 76, boxSizing: 'border-box' }}>
      <FM_AboutHeader />

      <div style={{ padding: '0 22px' }}>
        <div className="stengazeta" style={{ color: FM.body, fontSize: 44, lineHeight: 0.95, marginBottom: 24 }}>
          КОНТАК-<br/>ТЫ
        </div>

        <p style={{ margin: 0, color: FM.bodyStrong, fontSize: 14, lineHeight: 1.5, marginBottom: 30 }}>
          Открыта к проектным и full-time предложениям. Напишите по любому из каналов — обычно отвечаю в течение суток.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rows.map((r, i) => (
            <div key={r.label} style={{
              padding: '18px 0',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              borderBottom: i === rows.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12,
            }}>
              <div className="stengazeta" style={{ color: FM.body, fontSize: 13, letterSpacing: '0.08em' }}>{r.label}</div>
              <div className="stengazeta" style={{ color: FM.paper, fontSize: 15, textAlign: 'right' }}>{r.value}</div>
            </div>
          ))}
        </div>
      </div>

      <TabBar active="contacts" />
    </div>
  );
}

Object.assign(window, {
  FM_Hero, FM_About, FM_Projects, FM_Contacts,
});
