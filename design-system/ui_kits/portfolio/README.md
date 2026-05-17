# Portfolio UI kit

Click-through recreation of Kristina's PROKSION portfolio site.
Three screens, all 1920-wide, scaled to fit the viewport.

## Files

| File | Role |
| --- | --- |
| `index.html` | Entry. Mounts React + Babel and the screens below. Auto-fits 1920px content to viewport. |
| `App.jsx` | Tiny router. Persists current route to `localStorage`. |
| `TopNav.jsx` | Top bar used on every screen. Wordmark · 3 nav items · year · active pill. |
| `HeroScreen.jsx` | Home — frame `171:5296`. Outlined giant "Port / folio" lockup + masked portrait on graphite panel. |
| `AboutScreen.jsx` | About — frame `172:5350`. Two masked photos + intro + 2 jobs (current red, previous red-α70) + education. |
| `ProjectsScreen.jsx` | Projects — frame `251:4591`. Sidebar category tree + ragged tile grid mixing placeholders with real thumbnails. |

## Coverage

Built directly from the JSX in the mounted Figma (`/Page-2/Frame-*`).
Where the Figma had absolute pixel positions, this kit preserves them.
Where the Figma left placeholders (empty paper-400 boxes, blue-slate
`#292c40` rectangles), this kit keeps them as placeholders — they are
the design.

## What's intentionally **not** included

- A contacts screen (no Figma source).
- Real project case-study pages (Figma only shows the index grid).
- A responsive narrow-viewport layout (Figma is desktop-only; we scale
  the page rather than reflow it).

## Iterating

- Edit a screen file in place; `App.jsx` re-routes from the nav.
- To clear the persisted route during testing:
  `localStorage.removeItem('proksion:route')`.
