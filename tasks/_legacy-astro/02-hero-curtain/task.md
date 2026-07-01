# Phase 02 — Hero + Curtain

## TL;DR

Собрать главную страницу `/` с занавесом-Hero: при первом заходе в сессию показывается полноэкранный hero (PROKSION wordmark, outlined «PORT/FOLIO» лок-ап, маскированный портрет на графитовой панели), любой инпут уводит его вверх и открывает контент под ним. На последующих переходах внутри сессии занавес уже не показывается. Адаптив 360 → 1920 c разной композицией, не scale.

## Prerequisites

- Фаза 01 завершена и провалидирована (`tasks/01-scaffold/verify.md` пройден полностью).
- `/front` поднимается через `npm run dev`, все 4 placeholder-роута отвечают.
- Шрифты Stengazeta + Kanit подгружаются.

## Контекст, который нужно загрузить

| Путь | Зачем |
|---|---|
| `_legacy/HeroSection.jsx` | Десктоп-композиция (1920×1080): размеры, позиции, цвета. Reference — **не копировать**, переписать на адаптив. |
| `_legacy/MobileHero.jsx` | Mobile-композиция reference: wordmark сверху, лок-ап ниже, графитовая панель снизу. |
| `_legacy/App.jsx` | Текущая логика curtain: фазы `visible → dismissing → gone`, обработчики wheel/touchstart/keydown/click, lock body overflow. |
| `_legacy/Portfolio.html` | CSS `.hero-overlay` и `@keyframes pkBob`. |
| `design-system/README.md` (раздел Imagery + Decorative micro-elements) | Маски, hairline stroke, red-pixel marker. |
| `design-system/assets/mask-hero.svg` | Маска для портрета. |
| `design-system/assets/photo-hero-portrait.png` | Сам портрет (5 MB — обязательно через `astro:assets`). |
| `design-system/assets/icon-marker-pixel.svg` | Красный pixel-marker (бобит у нижнего края, hint «нажми»). |
| `design-system/colors_and_type.css` | Токены `--t-hero`, `--t-port-folio`, `--accent`, `--bg`, `--bg-panel`, `--fg-strong`, `--stroke-display`, mobile-токены. |

## Архитектурные решения (повтор)

- **Curtain — React-island** (`client:load`). Это единственная интерактивная часть страницы.
- **Hero-композиция внутри curtain — `.astro` server component** (рендерится статикой, проходит через slot в curtain). React-острову достаются только обработчики событий и анимация.
- **sessionStorage** ключ `proksion:curtain:dismissed` — `"1"` после первого dismiss. На любой странице (`/`, `/projects`, `/contacts`) curtain читает этот флаг при mount: если `"1"` — сразу не рендерится. Это значит: занавес показывается **один раз за сессию**, на главной.
- **Curtain рендерится только на `/`** в этой фазе. На остальных страницах его не вставляем — там он не нужен.
- Адаптив: **разные композиции** на мобайл (стек) и десктоп (две колонки). Не scale stage.

## Deliverables

### A. Изображения через astro:assets

Подключить hero-портрет через optimized pipeline:

```ts
// front/src/data/hero-images.ts
import portraitSrc from '../../public/assets/photo-hero-portrait.png';
export { portraitSrc };
```

В компонентах импортить и использовать `<Image src={portraitSrc} ... />` из `astro:assets`. Это даст автоматический `srcset`, AVIF/WebP, lazy/eager.

Если `import` из `public/` не работает (Astro предпочитает `src/assets/`) — поднять изображения в `src/assets/`. **Симлинк** `front/src/assets` → `../../design-system/assets` создать аналогично `public/assets`:

```bash
ln -s ../../design-system/assets front/src/assets
```

Тогда `import portraitSrc from '@/assets/photo-hero-portrait.png';` работает корректно через alias.

Маски (`mask-hero.svg`) — оставить в `public/` (через симлинк), потому что `mask-image: url(/assets/mask-hero.svg)` использует runtime URL, а не bundle-import.

### B. Компонент Hero

`front/src/components/hero/HeroComposition.astro` — pure visual, без интерактива:

```astro
---
import { Image } from 'astro:assets';
import portraitSrc from '@/assets/photo-hero-portrait.png';
---

<div class="hero">
  <div class="hero__panel" aria-hidden="true">
    <div class="hero__photo-mask">
      <Image
        src={portraitSrc}
        alt=""
        widths={[640, 960, 1280, 1920]}
        sizes="(max-width: 767px) 100vw, 53vw"
        formats={['avif', 'webp']}
        loading="eager"
        fetchpriority="high"
        class="hero__photo"
      />
    </div>
  </div>

  <span class="hero__wordmark">PROKSION</span>

  <div class="hero__lockup" aria-hidden="true">
    <div class="hero__lockup-line">PORT</div>
    <div class="hero__lockup-line hero__lockup-line--folio">FOLIO</div>
  </div>

  <img
    src="/assets/icon-marker-pixel.svg"
    alt=""
    class="hero__marker"
    aria-hidden="true"
  />
</div>

<style>
  .hero {
    position: relative;
    width: 100%;
    height: 100dvh;
    min-height: 100vh;
    background: var(--bg);
    overflow: hidden;
  }

  /* === Desktop (≥1024) — две колонки ===================================== */
  .hero__panel {
    position: absolute;
    inset: 0 0 0 47%;
    background: var(--bg-panel);
    overflow: hidden;
  }

  .hero__photo-mask {
    position: absolute;
    inset: 0;
    transform: rotate(-3.6deg);
    transform-origin: center;
  }

  .hero__photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
    -webkit-mask-image: url(/assets/mask-hero.svg);
    -webkit-mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-position: center;
            mask-image: url(/assets/mask-hero.svg);
            mask-size: contain;
            mask-repeat: no-repeat;
            mask-position: center;
  }

  .hero__wordmark {
    position: absolute;
    top: calc(var(--sp-9) + 12px);
    left: var(--page-pad);
    font-family: var(--font-display);
    font-size: var(--t-hero);
    font-weight: 700;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: var(--tracking-caps);
    line-height: 1;
  }

  .hero__lockup {
    position: absolute;
    top: 22%;
    left: calc(var(--page-pad) - 8px);
    line-height: 0.82;
    font-family: var(--font-display);
    font-weight: 400;
    color: var(--fg-strong);
    -webkit-text-stroke: var(--stroke-display) var(--border);
    text-transform: uppercase;
    letter-spacing: var(--tracking-display);
    pointer-events: none;
  }

  .hero__lockup-line {
    font-size: var(--t-port-folio);
  }

  .hero__lockup-line--folio {
    margin-top: -0.1em;
    /* На десктопе оригинал имеет 360px vs 380px — масштабируем чуть-чуть */
    font-size: calc(var(--t-port-folio) * 0.95);
  }

  .hero__marker {
    position: absolute;
    bottom: var(--sp-6);
    left: 23%;
    width: 32px;
    height: 38px;
    transform: rotate(90deg);
    animation: hero-marker-bob 1.6s ease-in-out infinite;
  }

  @keyframes hero-marker-bob {
    0%, 100% { transform: rotate(90deg) translateX(0); }
    50%      { transform: rotate(90deg) translateX(8px); }
  }

  /* === Tablet (768–1023) — две колонки, ужатая типографика =============== */
  @media (max-width: 1023px) {
    .hero__panel { inset: 0 0 0 50%; }
    .hero__lockup { top: 24%; }
    .hero__marker { left: 18%; }
  }

  /* === Mobile (<768) — стек: wordmark / lockup / panel снизу ============= */
  @media (max-width: 767px) {
    .hero__panel {
      inset: auto 0 0 0;
      height: 48dvh;
    }

    .hero__wordmark {
      top: calc(var(--mob-safe-bottom, 0px) + var(--sp-7));
      left: var(--page-pad);
    }

    .hero__lockup {
      top: calc(var(--sp-7) + 80px);
      left: var(--page-pad);
    }

    .hero__lockup-line,
    .hero__lockup-line--folio {
      font-size: var(--t-port-folio);
    }

    .hero__marker {
      bottom: calc(var(--mob-safe-bottom, 0px) + var(--sp-5));
      left: 50%;
      transform: translateX(-50%) rotate(90deg);
      animation: hero-marker-bob-mob 1.6s ease-in-out infinite;
    }

    @keyframes hero-marker-bob-mob {
      0%, 100% { transform: translateX(-50%) rotate(90deg) translateY(0); }
      50%      { transform: translateX(-50%) rotate(90deg) translateY(8px); }
    }
  }

  @media (max-width: 479px) {
    .hero__panel { height: 42dvh; }
  }
</style>
```

Координаты выше — стартовые. Подгоняйте визуально, сверяясь с `_legacy/HeroSection.jsx` (десктоп) и `_legacy/MobileHero.jsx` (mobile).

### C. React-остров Curtain

`front/src/components/hero/Curtain.tsx`:

```tsx
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

const STORAGE_KEY = 'proksion:curtain:dismissed';

type Phase = 'visible' | 'dismissing' | 'gone';

export function Curtain({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>(() => {
    if (typeof window === 'undefined') return 'visible';
    return sessionStorage.getItem(STORAGE_KEY) === '1' ? 'gone' : 'visible';
  });

  const dismiss = () => setPhase(p => (p === 'visible' ? 'dismissing' : p));

  useEffect(() => {
    if (phase !== 'dismissing') return;
    const t = setTimeout(() => {
      sessionStorage.setItem(STORAGE_KEY, '1');
      setPhase('gone');
    }, 600);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase === 'gone') {
      document.documentElement.style.overflow = '';
      return;
    }
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = ''; };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'visible') return;
    const onWheel = () => dismiss();
    const onTouch = () => dismiss();
    const onKey = () => dismiss();
    window.addEventListener('wheel', onWheel, { passive: true, once: true });
    window.addEventListener('touchstart', onTouch, { passive: true, once: true });
    window.addEventListener('keydown', onKey, { once: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouch);
      window.removeEventListener('keydown', onKey);
    };
  }, [phase]);

  if (phase === 'gone') return null;

  return (
    <div
      className={`curtain${phase === 'dismissing' ? ' curtain--dismissing' : ''}`}
      onClick={dismiss}
      role="button"
      tabIndex={0}
      aria-label="Войти на сайт"
    >
      {children}
    </div>
  );
}
```

И сопровождающий CSS — `front/src/components/hero/Curtain.css`:

```css
.curtain {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: var(--bg);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.55s cubic-bezier(.6, .05, .3, 1);
  will-change: transform;
}

.curtain--dismissing {
  transform: translateY(-100%);
  pointer-events: none;
}
```

Импортить `Curtain.css` из `Curtain.tsx` (top-level `import './Curtain.css';`) — Vite сам бандлит.

### D. Подключение на главной

`front/src/pages/index.astro`:

```astro
---
import BaseLayout from '@/layouts/BaseLayout.astro';
import HeroComposition from '@/components/hero/HeroComposition.astro';
import { Curtain } from '@/components/hero/Curtain';
---

<BaseLayout title="PROKSION — Kristina · портфолио">
  <Curtain client:load>
    <HeroComposition />
  </Curtain>

  <main id="content">
    <!-- Phase 03 наполнит -->
    <p style="padding: var(--sp-9) var(--page-pad); color: var(--fg);">
      About content — phase 03.
    </p>
  </main>
</BaseLayout>
```

`client:load` — нужен, потому что curtain должен мгновенно среагировать на пользовательский инпут. `client:idle` — нельзя, между «гидрацией» и первым кликом может вклиниться пользователь.

**Важно**: HeroComposition отдаётся в slot Curtain. Это значит, что HTML и CSS Hero попадают в bundle **серверной** части и НЕ зависят от JS. Если curtain заблокируется (JS off, ошибка), пользователь всё равно увидит первый экран — но без возможности «зайти». Это лучше, чем пустой экран.

### E. Базовые правила в global.css

Дополнить `front/src/styles/global.css`:

```css
html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-body);
  font-weight: 700;
  font-size: var(--t-body);
  line-height: var(--lh-body);
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

body { min-height: 100vh; min-height: 100dvh; }

::selection {
  background: var(--accent);
  color: var(--fg-strong);
}

* { box-sizing: border-box; }
```

Не дублировать токены, которые уже есть в `colors_and_type.css`.

## Implementation guidance

- **Маска hero**: в оригинале использована `transform: rotate(-3.6deg)` с большими `width/height` за рамками контейнера и сдвигом. Маска отрезает портрет в нужной зоне. В адаптивной версии — то же самое, но размеры от `100% × 100%` (заполняют панель), а `mask-size: contain` сжимает маску внутрь. Если по визуалу маска становится слишком маленькой — увеличьте `mask-size: 110%` или конкретные пиксели. Проверьте на 1280 / 1440 / 1920.
- **Outlined lockup**: `--t-port-folio` = 380px на десктопе, 144px на mobile. Делайте `font-size: var(--t-port-folio)` — на каждом @media-уровне переменная переопределяется. Не задавайте размеры через `font-size: clamp(...)` — мы договорились о дискретных сетах.
- **dvh vs vh**: используйте `100dvh` с фоллбеком `100vh` — на mobile-браузерах с динамическим UI Chrome iOS Safari выдают разную высоту. dvh даёт «живую» высоту, vh — статичную.
- **`@keyframes` в `<style>`**: Astro scopes стили компонента — keyframes тоже скоупятся. Это норм. Если нужно глобально — `@keyframes` в `global.css`.
- **`prefers-reduced-motion`**: остановите `hero-marker-bob` для пользователей с такой preference:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .hero__marker { animation: none; }
    .curtain { transition: opacity 0.2s; }
    .curtain--dismissing { transform: none; opacity: 0; }
  }
  ```
- **Локальная проверка sessionStorage**: открыть DevTools → Application → Session Storage → `http://localhost:4321` → проверить ключ `proksion:curtain:dismissed`. После первого dismiss он = `"1"`. Чтобы протестировать снова — удалить ключ или открыть в Incognito.
- **TypeScript для React-острова**: `tsconfig.json` должен включать `"jsx": "react-jsx"`. Если Astro-strict-config даёт `"jsx": "preserve"` — это норм, `@astrojs/react` сам разбирается. Если type-check ругается — поднимайте конкретную ошибку.

## Don't do

- **Не вставляйте `<Curtain>` на `/projects` или `/contacts`** — он только на главной. Если пользователь перешёл на сайт через `/projects` напрямую — это OK, занавес не нужен, он чисто декоративный.
- **Не пишите own image optimization** — `astro:assets` делает всё.
- **Не используйте Tailwind / utility-first frameworks** — только нативный CSS с токенами.
- **Не добавляйте параллакс / hover-эффекты** на hero — design-system явно запрещает (`No parallax. No bounces.`).
- **Не верстайте About-контент** под занавесом — это фаза 03. Placeholder-абзаца достаточно.
- **Не оптимизируйте остальные изображения** (about-photos, project-thumbnails) — это фаза 03 и 04.
- **Не используйте `clamp()` для `font-size`** — типография через дискретные @media-сеты, мы это решили.

## Верификация

`verify.md`.
