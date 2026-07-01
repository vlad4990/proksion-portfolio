# Phase 04 — Projects

## TL;DR

Собрать раздел `/projects` с динамическим SSR-роутингом `/projects/[section]/[subsection]`. Слева — sidebar с деревом категорий (group + children), справа — masonry-grid с тайлами проектов. На первой загрузке данные берутся через SSR (server fetch к stub-API), при переключении подсекции — клиентский fetch + skeleton, без полной перезагрузки. URL обновляется через `history.pushState`.

## Prerequisites

- Фазы 01–03 завершены и провалидированы.
- Astro-проект собирается, hybrid output работает, `/projects/[section]/[subsection]` уже отдаёт `Astro.params` (placeholder из фазы 01).

## Контекст, который нужно загрузить

| Путь | Зачем |
|---|---|
| `_legacy/ProjectsScreen.jsx` | Десктоп-структура: sidebar с группами/детьми, masonry через CSS columns, hover-эффекты, marker для активной группы. Список категорий: Press F, KUPIKOD, Рисование, Sketchbook, UI/UX кейсы. |
| `_legacy/MobileProjects.jsx` | Mobile-композиция: tabs/chips/accordion вместо sidebar, single-column grid. |
| `design-system/preview/comp-sidebar.html`, `comp-project-tiles.html` | Эталоны вёрстки sidebar и тайлов (если есть в preview/). |
| `design-system/README.md` (Decorative micro-elements) | Marker-glyph для активной группы. |
| `design-system/colors_and_type.css` | `--radius-card: 4px` (active row sidebar), `--radius-tile: 0px` (тайлы), `--c-paper-400` / `--c-paper-500` (fills для placeholder-плиток). |
| `_legacy/assets/project-post.png`, `project-success.png` | Реальные миниатюры (через `design-system/assets/`). |

## Архитектурные решения (повтор)

- **Маршруты**:
  - `/projects` — landing, открывает дефолтную секцию (например `press-f/banners`).
  - `/projects/[section]/[subsection]` — динамический SSR (`export const prerender = false`).
- **Sidebar и Grid — React-острова** (`client:load`), они **общаются** через общий контекст или через URL.
- **State источник истины — URL**: `/projects/press-f/banners` означает `section='press-f', subsection='banners'`. При клике на subsection в sidebar — обновляем URL через `history.pushState`, Grid слушает popstate / синхронный обновлённый URL и фетчит.
- **API**: `front/src/lib/api.ts` экспортирует `fetchProjects(section, subsection): Promise<ProjectTile[]>`. Сейчас возвращает stub-данные (плейсхолдеры). Контракт оформлен так, что будущий `/back` подменит только реализацию.
- **SSR vs client fetch**: при прямом заходе на URL `/projects/press-f/banners` — данные подтягиваются на сервере (await fetch внутри `.astro`) и приходят уже встроенными в HTML. При клике на другую subsection без полной навигации — fetch выполняется клиентом с показом skeleton.

## Deliverables

### A. Типы и моки

`front/src/lib/projects-tree.ts` — дерево категорий, single source:

```ts
export type ProjectSubsection = {
  id: string;
  label: string;
};

export type ProjectSection = {
  id: string;
  label: string;
  children: readonly ProjectSubsection[];
};

export const projectsTree: readonly ProjectSection[] = [
  {
    id: 'press-f',
    label: 'Press F',
    children: [
      { id: 'banners', label: 'Баннера' },
      { id: 'vitriny', label: 'Витрины товаров' },
      { id: 'posts', label: 'Посты в соц.сети' },
    ],
  },
  {
    id: 'kupikod',
    label: 'KUPIKOD',
    children: [
      { id: 'banners', label: 'Баннера' },
      { id: 'youtube', label: 'YouTube обложки' },
      { id: 'posts', label: 'Посты в соц.сети' },
    ],
  },
  {
    id: 'drawing',
    label: 'Рисование',
    children: [
      { id: 'painting', label: 'Живопись' },
      { id: 'drawing', label: 'Рисунок' },
      { id: 'digital', label: 'Диджитал арт' },
    ],
  },
  { id: 'sketchbook', label: 'Sketchbook', children: [] },
  { id: 'uiux', label: 'UI/UX кейсы', children: [] },
];

export const DEFAULT_SECTION = 'press-f';
export const DEFAULT_SUBSECTION = 'banners';

export function findSection(id: string): ProjectSection | undefined {
  return projectsTree.find(s => s.id === id);
}

export function findSubsection(sectionId: string, subId: string): ProjectSubsection | undefined {
  return findSection(sectionId)?.children.find(c => c.id === subId);
}
```

`front/src/lib/api.ts`:

```ts
export type ProjectTile = {
  id: string;
  /** desired tile height in px on desktop; mobile reflows */
  height: number;
  /** if set — image; otherwise solid fill color from token name like 'paper-400' */
  image?: string;
  fill?: 'paper-300' | 'paper-400' | 'paper-500' | 'paper-600';
  title?: string;
};

const STUB_TILES: ProjectTile[] = [
  { id: 't1', height: 320, fill: 'paper-400' },
  { id: 't2', height: 240, fill: 'paper-600' },
  { id: 't3', height: 420, image: '/assets/project-success.png' },
  { id: 't4', height: 280, fill: 'paper-300' },
  { id: 't5', height: 200, fill: 'paper-500' },
  { id: 't6', height: 360, fill: 'paper-400' },
  { id: 't7', height: 320, image: '/assets/project-post.png' },
  { id: 't8', height: 180, fill: 'paper-600' },
  { id: 't9', height: 440, fill: 'paper-300' },
  { id: 't10', height: 260, fill: 'paper-400' },
  { id: 't11', height: 320, fill: 'paper-500' },
  { id: 't12', height: 220, fill: 'paper-600' },
  { id: 't13', height: 380, fill: 'paper-400' },
  { id: 't14', height: 200, fill: 'paper-300' },
  { id: 't15', height: 300, fill: 'paper-500' },
  { id: 't16', height: 240, fill: 'paper-400' },
];

export async function fetchProjects(
  section: string,
  subsection: string
): Promise<ProjectTile[]> {
  // В будущем — вызов /back. Сейчас имитируем latency для skeleton.
  await new Promise(r => setTimeout(r, 250));
  // Pseudo-различение контента по section/subsection — пока возвращаем тот же набор.
  // Когда появится backend, замените реализацию.
  return STUB_TILES;
}
```

Этот API намеренно одинаков для всех `(section, subsection)`, чтобы видеть переключения skeleton без необходимости создавать осмысленные mock-данные на каждую пару.

### B. Маршруты

`front/src/pages/projects/index.astro` — редирект на дефолтную пару:

```astro
---
import { DEFAULT_SECTION, DEFAULT_SUBSECTION } from '@/lib/projects-tree';
return Astro.redirect(`/projects/${DEFAULT_SECTION}/${DEFAULT_SUBSECTION}`);
---
```

Или (если хочется landing-page без редиректа) — рендерить SSR-страницу с дефолтными параметрами, но без редиректа. Решение по месту; редирект проще.

`front/src/pages/projects/[section]/[subsection].astro`:

```astro
---
export const prerender = false;

import BaseLayout from '@/layouts/BaseLayout.astro';
import { findSection, findSubsection } from '@/lib/projects-tree';
import { fetchProjects } from '@/lib/api';
import { ProjectsLayout } from '@/components/projects/ProjectsLayout';

const { section, subsection } = Astro.params as { section: string; subsection: string };

const sectionData = findSection(section);
if (!sectionData) {
  return Astro.redirect('/projects');
}

const isLeaf = sectionData.children.length === 0;
const subData = isLeaf ? null : findSubsection(section, subsection);
if (!isLeaf && !subData) {
  // sub не найден — редиректим на первый child
  const firstChild = sectionData.children[0]?.id;
  if (firstChild) {
    return Astro.redirect(`/projects/${section}/${firstChild}`);
  }
}

// Server-side fetch для SSR — приходит готовым HTML
const initialTiles = await fetchProjects(section, subsection);

const titleSection = sectionData.label;
const titleSub = subData?.label ?? '';
---

<BaseLayout title={`PROKSION · ${titleSection}${titleSub ? ' · ' + titleSub : ''}`}>
  <main id="content">
    <ProjectsLayout
      client:load
      initialSection={section}
      initialSubsection={subsection}
      initialTiles={initialTiles}
    />
  </main>
</BaseLayout>
```

### C. React-острова

Все три файла в `front/src/components/projects/`:

#### ProjectsLayout.tsx (root client island)

```tsx
import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { Grid } from './Grid';
import { fetchProjects, type ProjectTile } from '@/lib/api';
import { findSection, projectsTree } from '@/lib/projects-tree';
import './projects.css';

interface Props {
  initialSection: string;
  initialSubsection: string;
  initialTiles: ProjectTile[];
}

export function ProjectsLayout({ initialSection, initialSubsection, initialTiles }: Props) {
  const [section, setSection] = useState(initialSection);
  const [subsection, setSubsection] = useState(initialSubsection);
  const [tiles, setTiles] = useState<ProjectTile[]>(initialTiles);
  const [loading, setLoading] = useState(false);

  const navigate = useCallback(async (nextSection: string, nextSub: string) => {
    if (nextSection === section && nextSub === subsection) return;

    const url = `/projects/${nextSection}/${nextSub}`;
    history.pushState({ section: nextSection, subsection: nextSub }, '', url);

    setSection(nextSection);
    setSubsection(nextSub);
    setLoading(true);
    try {
      const data = await fetchProjects(nextSection, nextSub);
      setTiles(data);
    } finally {
      setLoading(false);
    }
  }, [section, subsection]);

  // popstate (back/forward)
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const match = location.pathname.match(/^\/projects\/([^/]+)\/([^/]+)/);
      if (!match) return;
      const [, s, sub] = match;
      setSection(s);
      setSubsection(sub);
      setLoading(true);
      fetchProjects(s, sub).then(setTiles).finally(() => setLoading(false));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <div className="projects">
      <Sidebar
        tree={projectsTree}
        activeSection={section}
        activeSub={subsection}
        onNavigate={navigate}
      />
      <Grid tiles={tiles} loading={loading} />
    </div>
  );
}
```

#### Sidebar.tsx

```tsx
import type { ProjectSection } from '@/lib/projects-tree';

interface Props {
  tree: readonly ProjectSection[];
  activeSection: string;
  activeSub: string;
  onNavigate: (section: string, sub: string) => void;
}

export function Sidebar({ tree, activeSection, activeSub, onNavigate }: Props) {
  return (
    <nav className="projects__sidebar" aria-label="Категории проектов">
      {tree.map(group => {
        const isActive = activeSection === group.id;
        return (
          <div key={group.id} className="sidebar-group">
            <button
              className={`sidebar-group__title${isActive ? ' sidebar-group__title--active' : ''}`}
              onClick={() => {
                const firstChild = group.children[0]?.id ?? '';
                onNavigate(group.id, firstChild);
              }}
            >
              {isActive && <img src="/assets/icon-marker-pixel.svg" alt="" className="sidebar-group__marker" />}
              {group.label}
            </button>
            {isActive && group.children.length > 0 && (
              <ul className="sidebar-group__children">
                {group.children.map(child => {
                  const isActiveChild = activeSub === child.id;
                  return (
                    <li key={child.id}>
                      <button
                        className={`sidebar-child${isActiveChild ? ' sidebar-child--active' : ''}`}
                        onClick={() => onNavigate(group.id, child.id)}
                      >
                        {child.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
```

#### Grid.tsx

```tsx
import type { ProjectTile } from '@/lib/api';

interface Props {
  tiles: ProjectTile[];
  loading: boolean;
}

const FILL_VAR: Record<NonNullable<ProjectTile['fill']>, string> = {
  'paper-300': 'var(--c-paper-300)',
  'paper-400': 'var(--c-paper-400)',
  'paper-500': 'var(--c-paper-500)',
  'paper-600': 'var(--c-paper-600)',
};

export function Grid({ tiles, loading }: Props) {
  if (loading) return <GridSkeleton />;

  return (
    <div className="projects__grid">
      {tiles.map(t => (
        <div
          key={t.id}
          className="tile"
          style={{
            height: t.height,
            background: t.image
              ? `url(${t.image}) center / cover no-repeat`
              : t.fill ? FILL_VAR[t.fill] : 'var(--c-paper-400)',
          }}
        />
      ))}
    </div>
  );
}

function GridSkeleton() {
  const heights = [320, 240, 420, 280, 200, 360, 320, 180, 440, 260, 320, 220];
  return (
    <div className="projects__grid projects__grid--loading" aria-busy="true">
      {heights.map((h, i) => (
        <div key={i} className="tile tile--skeleton" style={{ height: h }} />
      ))}
    </div>
  );
}
```

### D. CSS

`front/src/components/projects/projects.css`:

```css
.projects {
  display: grid;
  grid-template-columns: 540px minmax(0, 1fr);
  gap: var(--sp-8);
  max-width: var(--page-w);
  margin: 0 auto;
  padding: calc(var(--sp-10) + var(--sp-7)) var(--page-pad) var(--sp-10);
}

.projects__sidebar {
  position: sticky;
  top: var(--sp-7);
  align-self: start;
}

.sidebar-group { margin-bottom: var(--sp-7); }

.sidebar-group__title {
  position: relative;
  display: block;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--t-section);
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: var(--tracking-caps);
  color: var(--fg-muted);
  white-space: nowrap;
  text-align: left;
  transition: color var(--dur-fast) var(--ease-out);
}
.sidebar-group__title:hover { color: var(--fg-strong); }
.sidebar-group__title--active { color: var(--accent); }

.sidebar-group__marker {
  position: absolute;
  left: -32px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 19px;
}

.sidebar-group__children {
  margin: var(--sp-5) 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.sidebar-child {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  color: var(--fg-muted);
  border: 0;
  padding: var(--sp-2) 0 var(--sp-2) 60px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--t-sub-section);
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: var(--tracking-caps);
  cursor: pointer;
  transition: background var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out);
}
.sidebar-child:hover { color: var(--fg-strong); }
.sidebar-child--active {
  background: var(--pill);
  color: var(--pill-fg);
  border-radius: 0 var(--radius-card) var(--radius-card) 0;
  padding: 10px 36px 10px 140px;
  margin-left: -80px;
  width: calc(100% + 80px);
}

/* Grid — masonry via CSS columns */
.projects__grid {
  column-count: 4;
  column-gap: 14px;
}
.projects__grid > .tile {
  display: block;
  width: 100%;
  margin-bottom: 14px;
  break-inside: avoid;
  border-radius: var(--radius-tile);
  cursor: pointer;
  transition: transform var(--dur-base) var(--ease-out);
}
.projects__grid > .tile:hover { transform: scale(1.02); }

.tile--skeleton {
  background: var(--c-skeleton);
  animation: tile-pulse 1.4s ease-in-out infinite;
}

@keyframes tile-pulse {
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 1; }
}

/* Tablet (1024–1279) — sidebar уже, 3 столбца */
@media (max-width: 1279px) {
  .projects { grid-template-columns: 360px minmax(0, 1fr); gap: var(--sp-7); padding-top: var(--sp-10); }
  .projects__grid { column-count: 3; }
  .sidebar-child--active { padding-left: 80px; margin-left: -40px; width: calc(100% + 40px); }
}

/* Smaller tablet (768–1023) — sidebar схлопывается в горизонтальные chips */
@media (max-width: 1023px) {
  .projects { grid-template-columns: 1fr; gap: var(--sp-6); }
  .projects__sidebar {
    position: static;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-3);
  }
  .sidebar-group { margin: 0; }
  .sidebar-group__title { font-size: var(--t-header-2); }
  .sidebar-group__marker { display: none; }
  .sidebar-group__children {
    flex-direction: row;
    flex-wrap: wrap;
    margin-top: var(--sp-3);
    width: 100%;
  }
  .sidebar-child {
    padding: var(--sp-2) var(--sp-4);
    font-size: var(--t-sub-section);
  }
  .sidebar-child--active {
    margin-left: 0;
    width: auto;
    padding: var(--sp-2) var(--sp-4);
    border-radius: var(--radius-card);
  }
  .projects__grid { column-count: 2; }
}

/* Mobile — single column */
@media (max-width: 767px) {
  .projects {
    padding: var(--sp-7) var(--page-pad);
  }
  .projects__grid { column-count: 1; }
  .sidebar-group__title { font-size: var(--t-section); }
  .sidebar-child { font-size: var(--t-body); }
}

@media (max-width: 479px) {
  .sidebar-group__title { font-size: 28px; }
}
```

### E. Integration

`front/src/pages/projects/[section]/[subsection].astro` уже импортирует `ProjectsLayout`. Убедитесь, что:
- prerender = false (SSR).
- `await fetchProjects(...)` выполняется на сервере (видно по skeleton: его НЕТ при прямом заходе на URL).
- При клике в sidebar на другую subsection — skeleton появляется, потом сменяется grid'ом.

## Implementation guidance

- **Hydration mismatch**: SSR-рендер должен соответствовать первому client-render. ProjectsLayout получает `initialTiles` уже подгруженные на сервере → `useState(initialTiles)` → первый render идентичен. Никаких `Math.random()` в default state.
- **`history.pushState` vs Astro nav**: используем pushState, потому что хотим SPA-like переключение без перезагрузки. Astro view-transitions (`<ClientRouter />`) дали бы то же, но требуют `client:load` всё равно и больше JS. Свой pushState проще и меньше.
- **Refresh на URL `/projects/press-f/vitriny`**: должен заработать (SSR отдаёт нужные tiles, остров гидрируется с правильным state). Это критично — это и есть смысл «SSR на первом открытии».
- **404 / неизвестный section**: `findSection` вернёт `undefined` → `Astro.redirect('/projects')`. Альтернативно, можно вернуть `404` страницу — но для этой фазы редирект проще.
- **Sticky sidebar**: на десктопе — `position: sticky; top: var(--sp-7);`. Чтобы работало, родитель `.projects` НЕ должен иметь `overflow: hidden`.
- **Skeleton**: показывать только при client-side fetch (`loading: true`), НЕ при первой SSR-загрузке. У SSR `initialTiles` уже есть, loading = false.
- **Иммутабельность tree**: `projectsTree as const` (через `readonly` + типы) — данные не меняются. Sidebar и Grid принимают пропы, не mutate.
- **Поведение «листовой» секции** (Sketchbook, UI/UX): нет детей → клик по группе делает URL `/projects/sketchbook/` (без subsection). Этого роута у нас нет. Решения:
  1. Сделать роут `/projects/[section]/index.astro` для листовых.
  2. Использовать dummy-subsection `all`: `/projects/sketchbook/all`.
  3. При клике на листовую группу — не менять URL, просто отображать таплы (т.е. не использовать pushState).
  **Рекомендую вариант 2** — единообразный роутинг. Тогда в data добавьте dummy-child `{ id: 'all', label: '' }` для листовых секций, и в Sidebar скройте child-row, если label пустой.

## Don't do

- **Не использовать React Router / TanStack Router** — у нас Astro pages + локальный pushState.
- **Не вводить state-management библиотеки** (Zustand, Jotai). Хватает useState + props.
- **Не вёрстать TopNav** — это фаза 05.
- **Не реализовывать модалки project-detail** — кейсы проектов не входят в текущий scope (источник Figma этого не предоставлял).
- **Не оптимизировать sidebar accordion-анимацию** в эту фазу — оставьте мгновенным toggle. Анимация — после согласования с пользователем.
- **Не подключать настоящий backend** — `fetchProjects` остаётся stub-ом до согласования контракта.

## Верификация

`verify.md`.
