# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PROKSION — графический-дизайн портфолио для Kristina. Чистый статичный сайт без сборки: один HTML-файл (`Portfolio.html`) загружает React 18 + Babel standalone из unpkg по CDN и подключает `.jsx`-файлы напрямую как `<script type="text/babel">`. Никакого npm/webpack/vite, нет `package.json`, нет тестов.

## Running locally

Откройте `Portfolio.html` напрямую в браузере, либо обслужите каталог любым статическим сервером (нужно для корректной загрузки шрифтов/масок):

```
python3 -m http.server 8000
# затем http://localhost:8000/Portfolio.html
```

Babel компилирует JSX в рантайме — изменения в `.jsx` подхватываются простым reload. Mobile-layout проверяется в DevTools при ширине ≤ 768px (брейкпойнт жёстко прошит и в CSS, и в `useIsMobile()`).

## Architecture

### Two layout trees, one app

`App.jsx` — корневой роутер. Через `useIsMobile()` (matchMedia `max-width: 768px`) выбирает одно из двух полностью отдельных деревьев компонентов:

- **Desktop** — стейдж 1920×1080/1838, отрисованный в absolute-позиционировании. Inline-скрипт в конце `Portfolio.html` (`fit()`) масштабирует `.stage` и `.nav-host` через `transform: scale(vw/1920)`, чтобы дизайн помещался в любую ширину окна. Компоненты: `TopNav`, `HeroSection`, `AboutSection`, `ProjectsScreen`.
- **Mobile** — нативный поток без масштабирования, ширина устройства. Компоненты: `MobileHero`, `MobileAbout`, `MobileProjects`, `MobileContacts`, `MobileTabBar`. Используют переменные `--mob-*` из CSS (отступы, высоты хедера/таб-бара, safe-area).

Mobile-компоненты НЕ являются адаптивными версиями desktop — это отдельные верстки с собственной типографикой (`--t-*-mob`) и отдельной навигацией (нижний таб-бар вместо top-nav). При правках одной страницы обычно нужно править оба дерева.

### Hero curtain

Обе ветки оборачивают первый экран в `.hero-overlay` (fixed, z-index 1000). Phase-машина в `App.jsx`: `visible` → `dismissing` → `gone`. Любой `wheel/touchstart/keydown` (или клик) переводит в `dismissing`; через 600 ms (совпадает с CSS-transition `translateY(-100%)`) → `gone`. Пока не `gone`, `document.documentElement.style.overflow = 'hidden'` блокирует скролл.

### Routing

In-memory route в state (`'home' | 'projects' | 'contacts'`) с персистом в `localStorage` под ключом `proksion:route`. На mobile-ветке навигация идёт через проп `onNav` из таб-бара; на desktop — `onHome/onAbout/onProjects` из `TopNav` (вкладка «КОНТАКТЫ» на десктопе сейчас no-op).

### Globals, not modules

Babel-standalone не поддерживает ES modules. Каждый `.jsx` объявляет функцию и вешает её в `window.<Name>`. Порядок `<script>` в `Portfolio.html` важен: компоненты должны быть зарегистрированы до `App.jsx`. Никаких `import`/`export` — в новых компонентах следуйте той же конвенции (`window.NewComp = NewComp;` в конце файла).

### Styling

Один глобальный `colors_and_type.css`. Дизайн-токены — CSS custom properties в `:root`:

- Палитра: `--c-ink-*` (тёмные), `--c-paper-*` (светлые), `--c-red-*` (единственный акцент `#a62323`).
- Семантика: `--bg`, `--fg`, `--accent`, `--fg-strong`, `--fg-muted`, `--pill`, и т. п. — предпочитайте их сырым hex'ам.
- Десктоп-шкала: `--t-hero` (100), `--t-header-1` (80), `--t-section` (52), `--t-header-2` (40), `--t-sub-section` (32), `--t-body` (22). Mobile-шкала: `--t-*-mob`.
- Шрифты — два: `Stengazeta` (display, все заголовки) и `Kanit` (Cyrillic build, тело и UI). Файлы в `fonts/`, подключаются `@font-face`. Никаких других веб-шрифтов в проекте не должно появляться.

Большая часть верстки на desktop — `position: absolute` с пиксельными координатами под стейдж 1920px (см. `HeroSection.jsx`, `AboutSection.jsx`, `ProjectsScreen.jsx`). Это намеренно — макет порт-нулём из Figma. Mobile использует normal-flow + flex, координаты от CSS-переменных.

### Assets

- `assets/` — фото и SVG-маски (`mask-hero.svg`, `mask-about-*.svg`). Маски применяются через `mask-image`/`-webkit-mask-image` к div'у с background-image портрета.
- `fonts/` — `Stengazeta-Regular.ttf`, `Kanit-Cyrillic.ttf`.
- `mobile-wireframes/` — отдельные HTML/JSX-эксперименты (Figma-подобный canvas, варианты мокапов). НЕ входят в продакшен-сайт — `Portfolio.html` их не подключает.
- `screenshots/` — справочные рендеры. `.design-canvas.state.json` — sidecar для design-canvas из `mobile-wireframes/`.

## Conventions

- Тексты UI — русские, в верхнем регистре для display-заголовков (`text-transform: uppercase`). При добавлении строк сохраняйте кириллицу и тон портфолио.
- React используется только через глобал `React`/`ReactDOM` (UMD). Хуки доступны (`React.useState` и т. д.). Никаких новых зависимостей через CDN без явной необходимости.
- Inline-стили — преобладающий способ стилизации в `.jsx`. Это сознательный выбор: верстка частично декларативна, и абсолютные координаты живут рядом с разметкой. Не выносите такие стили в CSS-классы без причины.
- Для общих токенов (цвета, шрифты, типографика, mobile-отступы) используйте `var(--...)` из `colors_and_type.css` — не дублируйте значения.
