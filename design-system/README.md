# Proksion — Design System

**Proksion** is the personal portfolio brand of **Kristina**, a Russian
graphic designer. The site is a single editorial showcase: hero with a
massive "Portfolio" lockup over a portrait, an "About me" résumé page,
and a "Projects" grid sorted into categories (KUPIKOD, Press F, banners,
social posts, illustration, sketchbook, UI/UX).

This is a **portfolio brand**, not a product. There's one surface: the
1920-wide desktop website, dark canvas, oversized type, one red accent.

## Source

- **Figma:** `Kristina_portfolio.fig` (1 page, 3 frames, mounted at
  `/Page-2/Frame-1948755838|9|73`). Reconstruct any detail by reading
  the JSX next to each frame in the mounted virtual filesystem.
- No codebase or live URL was provided; everything below is read from
  the Figma binary.

## What's in this folder

| Path | What it is |
| --- | --- |
| `README.md` | This file — voice, visual language, iconography, font subs |
| `SKILL.md` | Skill descriptor for Claude Code / Agent SKills |
| `colors_and_type.css` | All design tokens — colors, type, spacing, motion |
| `assets/` | Real images + SVG masks + the red-square icon primitive (copied from the Figma) |
| `fonts/` | (placeholder) — drop the original `.otf/.ttf` here when you have them |
| `preview/` | One small HTML card per design-system concept — renders in the Design System tab |
| `ui_kits/portfolio/` | Hi-fi recreation of all three site screens, click-through |

## Asset manifest

```
assets/
├── photo-hero-portrait.png     hero portrait (home)
├── photo-about-1.jpg           about — top masked photo
├── photo-about-2.png           about — bottom masked photo
├── project-success.png         projects — "successful release" thumbnail
├── project-post.png            projects — KUPIKOD post thumbnail
├── mask-hero.svg               hand-drawn mask for hero portrait
├── mask-about-1.svg            hand-drawn mask for about photo 1
├── mask-about-2.svg            hand-drawn mask for about photo 2
└── icon-marker-pixel.svg       red pixel-art play marker (16×19; rotate 90° for "expanded")
```

## Preview cards (20 total)

- **Colors** — accent, ink scale, paper scale, semantic tokens
- **Type** — families, scale, outlined display, body
- **Spacing** — scale, radii, elevation rules
- **Components** — top nav, sidebar tree, résumé entry, project tiles, marker/bullet, nav states
- **Brand** — wordmark, photo mask, canvas

## UI kits

- `ui_kits/portfolio/` — three screens (home, about, projects), top-nav routed in React.

## Index

- **Visual language overview** — see `VISUAL FOUNDATIONS` below
- **Voice & copy** — see `CONTENT FUNDAMENTALS` below
- **Iconography** — see `ICONOGRAPHY` below
- **Tokens** — `colors_and_type.css`
- **Components & screens** — `ui_kits/portfolio/`

---

## CONTENT FUNDAMENTALS

The site speaks **Russian** throughout. The voice is **first-person,
quiet, matter-of-fact** — a designer presenting work, not selling.

### Voice characteristics

- **Person:** first person (я), addresses the reader implicitly. No "you".
- **Register:** informal-neutral. Not corporate. Not playful. The
  copywriting is the designer talking about her own life — see the
  about page intro:
  > «С детства я рисую, играю в компьютер, занимаюсь музыкой и
  > полностью погружена в творчество по сей день: люблю комиксы,
  > фильмы, путешествия, активно веду скетчбук, пробую себя в разных
  > хобби.»
  ("Since childhood I draw, play video games, do music, and I'm fully
  immersed in creativity to this day…")
- **Casing:** display headings are **ALL CAPS** (Cyrillic and Latin).
  Body text is sentence case. Nav items are ALL CAPS.
- **Punctuation:** sparse. Periods are often dropped at the end of
  résumé lines. Bullet markers are absent — the layout *is* the list.
- **Tone:** confident-modest. Job titles and company names sit side by
  side as facts ("Lofty. Графический дизайнер · 1.5 года"), no
  superlatives, no "passionate-about-pixel-perfect" filler.
- **Emoji:** none.
- **Numerals:** Arabic ("1.5 года", "6 месяцев", "2025"). Years are bare.
- **Names of companies:** styled in the **red accent** to call them out
  inline within résumé entries (Lofty, Копирка).
- **English peppered in:** "Press F", "KUPIKOD", "UI/UX", "YouTube",
  "smm" — these stay in Latin script and lowercase or as the brand
  itself spells them. The wordmark "PROKSION" is always Latin.

### Sample patterns

| Where | Russian example | English gloss |
| --- | --- | --- |
| Section head | `ОПЫТ РАБОТЫ` | "Work experience" |
| Section head | `ОБРАЗОВАНИЕ` | "Education" |
| Nav | `ПРОЕКТЫ` / `ОБО МНЕ` / `КОНТАКТЫ` | "Projects / About me / Contacts" |
| Job-card | `LOFTY.   ГРАФИЧЕСКИЙ ДИЗАЙНЕР     1.5 ГОДА` | Company · role · duration |
| Project tag | `UI/UX КЕЙСЫ`, `БАННЕРА`, `ПОСТЫ В СОЦ.СЕТИ` | Project category labels |

### Vibe

Editorial. Like a riso-printed art-school zine ported to the web.
Words do less work than the typography; the typography does most of
the storytelling.

---

## VISUAL FOUNDATIONS

> **TL;DR — Soviet wall-newspaper poster meets graphic-design student
> zine. Near-black background, oversized stencil-blocky display type
> outlined in true black, one blood-red accent, photos clipped through
> hand-drawn rough vector masks. No gradients. No emoji. No glow.**

### Background

- **Always** `#141414` — a true near-black, never pure `#000`.
- **Full-bleed**. No center column, no card wrapper around the page.
- **Inset surfaces**: a darker `#0a0e15` is used for the empty
  project-tile placeholders on the Projects page; a graphite
  `#434145` is used as a wide vertical "photo column" on the hero.
- **No gradients.** Anywhere. Solids only.
- **No noise/grain** on the canvas itself; texture comes from the
  imagery, not the background.

### Color

- **Single accent**: `#a62323` (slightly burnt red, not crimson, not
  scarlet). Used on:
  - the wordmark `PROKSION`
  - the active project category in the sidebar
  - inline emphasis on company names in résumé entries
  - tiny square list-bullets
- A **dimmed alpha** of the same red (`rgba(166,35,35,0.7)`) is used
  to subtly weaken older roles in the work-experience list — same
  hue, lower presence.
- Light values are deliberately **off-white** (`#bfbfbf` body,
  `#e4e4e4` display) — never `#fff`. This keeps the screen feeling
  printed, not lit.

### Type

- **Two families do all the work:**
  - `Stengazeta` — display. Blocky, slightly square, condensed sans
    with the Soviet stencil DNA. Used at 40 / 52 / 80 / 100 / 537px.
  - `Kanit` 700 — body and UI. Geometric sans, 22–24px.
- **Cyrillic is the dominant script.** Latin words intrude
  (`PROKSION`, `Press F`, `KUPIKOD`). Both render in the same
  display family.
- **Hero typography is a layout element**, not a label. The word
  `PORTFOLIO` is set at >500px with a black outline, clipped against
  the dark canvas as raw graphic texture.
- **Outlined display letters**: the giant "Port / folio" word has a
  ~2.4px stroke in pure `#000` — readable only because the fill is
  off-white over a dark canvas.
- **No serif. No script. No mono.**

### Layout

- Frame is **1920×1080+** desktop only — no responsive thinking is
  evident in the Figma. The grid is **freeform** (absolute positioning
  in source); the implicit gutter is **80px** from the left/right
  edges.
- **Top nav** is a single row: wordmark left, four ALL-CAPS items
  centered, year ("2025") right. Active item gets a `#e4e4e4` pill
  with `12px` radius and ~`34px` horizontal padding.
- **Projects page** uses a left rail (category tree, ~280px) and a
  ragged tile grid where tiles can be square, wide, or tall —
  there's no enforced grid module.
- **About page** runs a single 1150-wide text column starting at
  x=680, with photos floating in the left half clipped to rough vector
  shapes.

### Imagery

- **Photos are clipped through hand-drawn vector masks** (see
  `assets/mask-hero.svg`, `mask-about-1.svg`, `mask-about-2.svg`).
  Edges are deliberately irregular — torn paper, not rounded
  corners.
- Mask edges carry a **hairline black stroke** (~1.3px).
- Photos are **color-treated dark / warm** — most look slightly
  desaturated and warm-shifted, never cool.
- **No drop shadows on photos.** They sit flat on the canvas.

### Borders, radius, shadow

- **Corner radii:**
  - `12px` — nav pill (only).
  - `~4.5px` — sidebar active row.
  - `0px` — everything else, including project tiles.
- **Borders:** only on outlined display letters and mask edges.
  Surface elements have **no borders**.
- **Shadows:** **none.** The whole system avoids elevation as a
  device.

### Transparency & blur

- The only use of alpha is the dimmed red (`rgba(166,35,35,0.7)`)
  to mark a "previous" or "secondary" entry.
- **No backdrop-blur, no glass, no frosted panels.**

### Animation / interaction

The Figma is static, so the following are inferred system rules:

- **Easing:** `cubic-bezier(.2,.7,.2,1)` (snappy out).
- **Duration:** 120ms for hover, 220ms for state changes.
- **Hover (text):** color shifts from `#bfbfbf` → `#e4e4e4`.
- **Hover (nav):** the underlying pill background fades in from
  `transparent` → `#e4e4e4` at `~50%` opacity; on press, full opacity.
- **Hover (tile):** subtle scale `1 → 1.02`, **no shadow change**.
- **Press:** scale `0.98` on tiles and nav.
- **No bounces, no spring physics, no parallax.**
- Page transitions: assume instant cuts; this is a flat editorial
  document, not a SPA with motion choreography.

### Decorative micro-elements

- **Tiny red squares** (`9.5×9.5px`, see Vector.jsx) used as list
  bullets and as a section-marker glyph next to "Press F" in the
  sidebar. Solid `#a62323`, no border.
- A small **red downward triangle/icon** marker appears in the
  hero (formed from a row of red squares rotated 90°).

### What to avoid (style anti-patterns)

- Bluish-purple or rainbow gradients
- Frosted glass / `backdrop-filter`
- Emoji of any kind
- Drop shadows behind cards
- Soft-rounded "modern SaaS" cards
- Pure white (`#fff`) text
- Centered single-column "landing page" layouts

---

## ICONOGRAPHY

The site uses **almost no icons**. The visual system leans entirely on
typography and photography. What little does exist:

- **Red pixel-art play marker** (`16×19px`, `#a62323`) — the only iconographic
  glyph in the system. Natural orientation points right (collapsed state);
  rotate 90° clockwise for "expanded". See `assets/icon-marker-pixel.svg`.
- **Hand-drawn vector masks** (`mask-hero.svg`, `mask-about-1.svg`,
  `mask-about-2.svg`) — these are not icons but they're the only
  vector artwork in the system and they carry the brand DNA. They're
  rough irregular blobs used to clip photos.
- **Wordmark logo**: the word `PROKSION` set in `Stengazeta` red
  serves as the logo. There is no glyph mark.

There is **no icon font**, **no Lucide / Heroicons / Material set**,
**no emoji**, **no Unicode dingbats**. If a UI surface needs an
indicator (chevron, close, search), draw it from the **red square**
or **red triangle** primitives — keep them tiny, solid, blocky.

If you absolutely need general-purpose icons (e.g. for a CMS or
admin UI that doesn't exist yet), substitute **Lucide** at
`stroke-width: 2.25`, color `currentColor`, and flag the substitution
to the user — there is no precedent in the source.

---

## Font status

Real font files ship with this design system:

| Family | Status | Notes |
| --- | --- | --- |
| **Stengazeta** Regular | ✅ shipped | `fonts/Stengazeta-Regular.ttf` |
| **Kanit** (Cyrillic build) | ✅ shipped | `fonts/Kanit-Cyrillic.ttf` |
| **Furore** | substituted with **Russo One** | only 9 uses in source |
| **Blue Block** | substituted with **Stengazeta** | only 3 uses; Stengazeta works fine at hero scale |
| **Funever Sans Display** | substituted with **Kanit** SemiBold | 1 use at 24px |
