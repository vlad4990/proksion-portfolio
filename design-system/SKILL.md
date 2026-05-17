---
name: proksion-design
description: Use this skill to generate well-branded interfaces and assets for PROKSION (Kristina's graphic-design portfolio brand), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI-kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files (`colors_and_type.css`, `assets/`, `preview/`, `ui_kits/portfolio/`).

If creating visual artifacts (slides, mocks, throwaway prototypes, etc.), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick start

1. `link rel="stylesheet" href="colors_and_type.css"` — gives you every color, type and spacing token as CSS custom properties (`--bg`, `--fg`, `--accent`, `--font-display`, `--t-display-1`, `--sp-*`, etc.) plus opinionated `.h-display-*` / `.nav-item` / `.pill` classes.
2. Background is **always** `#141414`. Bodies are **#c4c4c4**. Accent is **#a62323** — single accent, no other hues.
3. Headlines run **Stengazeta** (real font shipped in `fonts/`), ALL-CAPS, condensed, blocky. Body runs **Kanit** Cyrillic build.
4. **No shadows. No gradients. No borders on cards. No emoji.** Photos clip through hand-drawn vector masks in `assets/mask-*.svg`.
5. The only icon in the system is a pixel-art play marker — `assets/icon-marker-pixel.svg` (16×19px, points right for collapsed / rotate 90° for expanded).

## What's available

| Folder | What's there |
| --- | --- |
| `assets/` | Hero portrait + about photos + project thumbnails + 3 hand-drawn mask SVGs + the red-square icon primitive |
| `preview/` | 20 tiny HTML cards documenting every token / component — pull any one open and read for usage patterns |
| `ui_kits/portfolio/` | Pixel-faithful recreation of all 3 site screens (home / about / projects) as React components; copy components out, repurpose layouts |

## Style anti-patterns to refuse

- Bluish-purple or rainbow gradients
- Frosted glass / `backdrop-filter`
- Emoji of any kind
- Drop shadows behind cards
- Soft-rounded "modern SaaS" cards (radius >12px on anything other than the nav pill is wrong)
- Pure white (`#fff`) text — use `#e4e4e4` or `#c4c4c4`
- Centered single-column "landing page" layouts — this brand is editorial / asymmetric

## Font caveat

Original fonts (Stengazeta, Furore, Blue Block, Kanit, Funever Sans Display) are commercial. We substitute with Google Fonts that support Cyrillic. If you have the originals, drop them in `fonts/` and update `colors_and_type.css`.

## Language

The brand speaks Russian. Latin words intrude (`PROKSION`, `KUPIKOD`, `Press F`, `UI/UX`, `smm`, `YouTube`) and stay in Latin script. Headlines are ALL CAPS in both scripts. Voice is **first-person, quiet, matter-of-fact** — see the CONTENT FUNDAMENTALS section in `README.md` for samples and rules.
