# PROKSION — портфолио · Vite + React + TypeScript

Портфолио графического дизайнера Кристины. Редакторская, брутально-плакатная
типографика на почти чёрном холсте с единственным кроваво-красным акцентом.

## Быстрый старт

```bash
npm install
npm run dev      # http://localhost:5173
```

## Сборка

```bash
npm run build    # tsc --noEmit + vite build → dist/
npm run preview  # локальная проверка билда
```

## Стилевая система — CSS Modules + токены

- **Дизайн-токены** — глобальные CSS Custom Properties в `src/styles/tokens.css`
  (`:root` + `@font-face` + базовые сбросы). Это единственный глобальный CSS.
- **Компоненты** стилизуются через **CSS Modules** (`*.module.css`): классы +
  `var(--token)`, никаких инлайновых стилей и хардкодов цветов/размеров.
  Единственные инлайновые значения — данные тайлов (высота, картинка/цвет).
- `src/styles/layout.module.css` — общая центрированная колонка `.page`.

## Адаптив — без масштабирования

Два дерева компонентов, переключение на `<768px` через `useIsMobile`:

- **Desktop (≥768px)** — фиксированные размеры по тирам токенов
  (`≥1400` / `1100–1399` / `768–1099`). Внутри тира ничего не «резинит»,
  кроме ширины колонок. Никакого `transform: scale()` / `clamp()`.
- **Mobile (<768px)** — нативный поток, фиксированный таб-бар снизу с
  `env(safe-area-inset-bottom)`.

## Структура

```
src/
├── App.tsx / App.module.css        # роутер + занавес-герой + хром страницы
├── main.tsx
├── types.ts                        # Route, HeroPhase
├── styles/
│   ├── tokens.css                  # глобальные токены (единственный глобальный CSS)
│   └── layout.module.css           # .page
├── hooks/useIsMobile.ts            # matchMedia(<768px)
└── components/
    ├── desktop/  TopNav · HeroSection · AboutSection · ProjectsScreen · ContactsScreen
    └── mobile/   MobileTabBar · MobileHero · MobileAbout · MobileProjects · MobileContacts
```

Каждый компонент — пара `.tsx` + `.module.css`.

## Что можно доделать

- Заменить placeholder-тайлы проектов реальными работами и страницей кейса.
- Оптимизировать вес изображений (исходники PNG крупные — стоит сжать/перевести в WebP).
- SEO: `og:*`-теги, финальный favicon.
