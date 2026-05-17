# Phase 05 — Contacts + Nav + Polish

## TL;DR

Доделать сайт: страница `/contacts` с реквизитами, общая `TopNav` для десктопа (вшита в `BaseLayout`), `MobileTabBar` для мобильного, финальный адаптив-аудит на всех брейкпойнтах, мета-теги/Open Graph, docker-compose с healthcheck'ом, обновление `CLAUDE.md`. Сайт после фазы 05 — отгружаемый в прод.

## Prerequisites

- Фазы 01–04 завершены и провалидированы.
- На `/`, `/projects`, `/projects/[section]/[subsection]` уже работает контент. Не работает только переключение между ними внутри одной страницы (нет видимой навигации).

## Контекст, который нужно загрузить

| Путь | Зачем |
|---|---|
| `_legacy/TopNav.jsx` | Десктоп-навигация: wordmark слева, 3 элемента по центру, год справа, активный пилл. |
| `_legacy/MobileTabBar.jsx` | Mobile bottom-bar: три таба с красной полосой-индикатором и красным текстом активного. |
| `_legacy/MobileContacts.jsx` | Контент страницы `/contacts` — заголовок, ссылки (Telegram, Behance, email и т.п.). |
| `design-system/preview/comp-nav.html` + `comp-nav-states.html` | Эталон nav-состояний. |
| `design-system/README.md` (CONTENT FUNDAMENTALS) | Тексты nav в верхнем регистре, английские вкрапления. |
| `design-system/colors_and_type.css` | `--radius-pill: 12px`, `--pill`, `--pill-fg`, `--accent`. |

## Архитектурные решения (повтор)

- **TopNav — `.astro`** (server component, без React-острова). Активный пункт определяется по `Astro.url.pathname`, т.е. на каждой странице сервер рендерит правильный pill.
- **MobileTabBar — `.astro`** server-rendered, по той же логике. **Хотя**: в нём могут понадобиться client-side обработчики для смены активного состояния, если есть SPA-переходы. Решение: оставить server-rendered, а активный таб переопределяется на каждой полной навигации. SPA-переход внутри `/projects/*` всё равно держит URL `/projects/...`, и таб «ПРОЕКТЫ» корректно подсвечен.
- **Layout shift**: nav-bar — fixed на mobile (bottom), на десктопе — sticky top. Контент имеет соответствующий padding.

## Deliverables

### A. TopNav (desktop)

`front/src/components/nav/TopNav.astro`:

```astro
---
const pathname = Astro.url.pathname;
const isAbout = pathname === '/' || pathname.startsWith('/about');
const isProjects = pathname.startsWith('/projects');
const isContacts = pathname.startsWith('/contacts');

const items = [
  { href: '/',         label: 'ОБО МНЕ',  active: isAbout },
  { href: '/projects', label: 'ПРОЕКТЫ',  active: isProjects },
  { href: '/contacts', label: 'КОНТАКТЫ', active: isContacts },
];
---

<nav class="topnav" aria-label="Главная навигация">
  <a href="/" class="topnav__wordmark">PROKSION</a>

  <ul class="topnav__list">
    {items.map(it => (
      <li>
        <a
          href={it.href}
          class:list={['topnav__item', it.active && 'topnav__item--active']}
          aria-current={it.active ? 'page' : undefined}
        >{it.label}</a>
      </li>
    ))}
  </ul>

  <span class="topnav__year">2025</span>
</nav>

<style>
  .topnav {
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--bg);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--sp-6) var(--page-pad);
    gap: var(--sp-6);
  }

  .topnav__wordmark {
    font-family: var(--font-display);
    font-size: var(--t-header-2);
    font-weight: 700;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: var(--tracking-caps);
    line-height: 1;
    text-decoration: none;
  }

  .topnav__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    gap: var(--sp-7);
  }

  .topnav__item {
    font-family: var(--font-display);
    font-size: var(--t-header-2);
    font-weight: 700;
    color: var(--fg-muted);
    text-transform: uppercase;
    letter-spacing: var(--tracking-caps);
    text-decoration: none;
    padding: 14px 0;
    line-height: 1;
    transition: color var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out);
  }
  .topnav__item:hover { color: var(--fg-strong); }
  .topnav__item--active {
    background: var(--pill);
    color: var(--pill-fg);
    border-radius: var(--radius-pill);
    padding: 14px 34px;
  }

  .topnav__year {
    font-family: var(--font-display);
    font-size: 28px;
    color: var(--fg-muted);
  }

  /* На mobile — скрываем top-nav, используем MobileTabBar */
  @media (max-width: 767px) {
    .topnav { display: none; }
  }

  /* Tablet — компактнее */
  @media (max-width: 1023px) {
    .topnav__list { gap: var(--sp-5); }
    .topnav__item { font-size: var(--t-sub-section); }
    .topnav__item--active { padding: 10px 24px; }
    .topnav__wordmark { font-size: var(--t-sub-section); }
  }
</style>
```

### B. MobileTabBar

`front/src/components/nav/MobileTabBar.astro`:

```astro
---
const pathname = Astro.url.pathname;
const isAbout = pathname === '/' || pathname.startsWith('/about');
const isProjects = pathname.startsWith('/projects');
const isContacts = pathname.startsWith('/contacts');

const tabs = [
  { href: '/',         label: 'ОБО МНЕ',  active: isAbout },
  { href: '/projects', label: 'ПРОЕКТЫ',  active: isProjects },
  { href: '/contacts', label: 'КОНТАКТЫ', active: isContacts },
];
---

<nav class="tabbar" aria-label="Главная навигация">
  {tabs.map(t => (
    <a
      href={t.href}
      class:list={['tabbar__tab', t.active && 'tabbar__tab--active']}
      aria-current={t.active ? 'page' : undefined}
    >
      {t.active && <span class="tabbar__indicator" aria-hidden="true" />}
      <span class="tabbar__label">{t.label}</span>
    </a>
  ))}
</nav>

<style>
  .tabbar {
    display: none;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 200;
    background: var(--bg);
    border-top: 1px solid rgba(255, 255, 255, 0.10);
    height: calc(var(--mob-tabbar) + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .tabbar__tab {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
  }

  .tabbar__indicator {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 22px;
    height: 3px;
    background: var(--accent);
    border-radius: 0 0 2px 2px;
  }

  .tabbar__label {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: var(--t-sub-section); /* 17px на mobile */
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--fg-muted);
    line-height: 1;
    transition: color var(--dur-base) var(--ease-out);
  }

  .tabbar__tab--active .tabbar__label { color: var(--accent); }

  @media (max-width: 767px) {
    .tabbar { display: flex; }
  }
</style>
```

### C. Подключение nav в Layout

`front/src/layouts/BaseLayout.astro` — добавить:

```astro
---
import '@/styles/tokens.css';
import '@/styles/fonts.css';
import '@/styles/breakpoints.css';
import '@/styles/global.css';
import TopNav from '@/components/nav/TopNav.astro';
import MobileTabBar from '@/components/nav/MobileTabBar.astro';

interface Props {
  title: string;
  description?: string;
  /** Скрыть nav (например, на главной до dismiss curtain). По умолчанию — показывать. */
  hideNav?: boolean;
}

const { title, description = 'PROKSION — портфолио Кристины', hideNav = false } = Astro.props;
---

<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="ru_RU" />
    <meta name="theme-color" content="#141414" />
    <link rel="preload" href="/fonts/Stengazeta-Regular.ttf" as="font" type="font/ttf" crossorigin />
    <link rel="preload" href="/fonts/Kanit-Cyrillic.ttf" as="font" type="font/ttf" crossorigin />
  </head>
  <body>
    {!hideNav && <TopNav />}
    <slot />
    {!hideNav && <MobileTabBar />}
  </body>
</html>
```

На главной — `<BaseLayout title="..." hideNav={false}>`. Curtain рендерится **поверх** nav (z-index 1000 > z-index 50), так что nav под занавесом, не виден. Ок.

### D. Контактная страница

`front/src/data/contacts.ts`:

```ts
export type ContactLink = {
  label: string;
  href: string;
  hint?: string;
};

export const contacts: readonly ContactLink[] = [
  { label: 'Telegram',  href: 'https://t.me/your_handle',          hint: '@your_handle' },
  { label: 'Behance',   href: 'https://www.behance.net/your',       hint: 'портфолио на Behance' },
  { label: 'Email',     href: 'mailto:hello@example.com',           hint: 'hello@example.com' },
  { label: 'Instagram', href: 'https://instagram.com/your_handle',  hint: '@your_handle' },
];
```

Реальные ссылки уточняются у пользователя — пока заглушки. Хорошо бы в комментарии написать «TODO: заменить на реальные» + завести в `_legacy/MobileContacts.jsx` ссылку на источник, если там что-то осмысленное.

`front/src/pages/contacts.astro`:

```astro
---
import BaseLayout from '@/layouts/BaseLayout.astro';
import { contacts } from '@/data/contacts';
---

<BaseLayout title="PROKSION · контакты">
  <main id="content" class="contacts">
    <h1 class="contacts__title">КОНТАКТЫ</h1>
    <ul class="contacts__list">
      {contacts.map(c => (
        <li class="contacts__item">
          <a href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel={c.href.startsWith('http') ? 'noopener noreferrer' : undefined} class="contacts__link">
            <span class="contacts__label">{c.label}</span>
            {c.hint && <span class="contacts__hint">{c.hint}</span>}
          </a>
        </li>
      ))}
    </ul>
  </main>
</BaseLayout>

<style>
  .contacts {
    max-width: var(--page-w);
    margin: 0 auto;
    padding: calc(var(--sp-10) + var(--sp-7)) var(--page-pad) var(--sp-10);
  }

  .contacts__title {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: var(--t-header-1);
    text-transform: uppercase;
    letter-spacing: var(--tracking-caps);
    color: var(--fg-muted);
    line-height: 1;
    margin: 0 0 var(--sp-9);
  }

  .contacts__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--sp-6);
  }

  .contacts__link {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    text-decoration: none;
    color: inherit;
    transition: color var(--dur-base) var(--ease-out);
  }
  .contacts__link:hover .contacts__label { color: var(--accent); }

  .contacts__label {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: var(--t-header-2);
    text-transform: uppercase;
    letter-spacing: var(--tracking-caps);
    color: var(--fg-strong);
    line-height: 1;
    transition: color var(--dur-base) var(--ease-out);
  }

  .contacts__hint {
    font-family: var(--font-body);
    font-weight: 700;
    font-size: var(--t-body);
    color: var(--fg-muted);
  }

  @media (max-width: 767px) {
    .contacts {
      padding: var(--sp-8) var(--page-pad) calc(var(--mob-tabbar) + var(--sp-7));
    }
  }
</style>
```

### E. Контент-padding для mobile tab-bar

На страницах с `MobileTabBar` контент должен иметь нижний padding ≥ `var(--mob-tabbar)`, иначе последние тайлы / последняя строка теста уйдут за полосу. Уже учтено в `contacts.astro`. Проверить и добавить в:

- `front/src/components/projects/projects.css` — `.projects { padding-bottom: calc(var(--mob-tabbar) + var(--sp-7)); }` внутри `@media (max-width: 767px)`.
- `front/src/components/about/About.astro` — аналогично.
- `front/src/pages/index.astro` — main padding-bottom на mobile.

### F. Sitemap + robots

`front/astro.config.mjs` — добавить интеграцию:

```bash
cd front
npx astro add sitemap
```

Конфиг:

```js
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // ...
  site: 'https://your-domain.example',   // TODO: подставить реальный домен от пользователя
  integrations: [react(), sitemap()],
});
```

`front/public/robots.txt`:

```
User-agent: *
Allow: /
Sitemap: https://your-domain.example/sitemap-index.xml
```

URL домена — заглушка, попросить у пользователя при сдаче.

### G. Docker — healthcheck

`docker-compose.yml`:

```yaml
services:
  front:
    build:
      context: .
      dockerfile: front/Dockerfile
    image: proksion-front:latest
    ports:
      - "4321:4321"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:4321/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
    environment:
      - NODE_ENV=production
```

Добавить в Dockerfile (runtime stage):

```dockerfile
RUN apk add --no-cache wget
```

Альтернатива — использовать встроенный `node -e "fetch('http://localhost:4321/').then(r=>process.exit(r.ok?0:1))"`, чтобы не ставить wget.

### H. Финальный аудит

Пройти по чек-листу в `verify.md` — там подробный визуальный sweep на 7 брейкпойнтах.

### I. Обновление CLAUDE.md

Финальная версия должна описывать:
- Стек: Astro 5 hybrid + React islands + Node adapter, TypeScript strict.
- Структура: `/front` Astro, `/design-system` source of truth, `/_legacy` reference, `/tasks` ушедшие фазы (отметить «миграция завершена»).
- Команды: `cd front && npm run dev` / `npm run build` / `npm run start` / `docker compose up --build`.
- Архитектура: SSR-роут `/projects/[section]/[subsection]`, остальное prerendered. Curtain через sessionStorage, single sweep per session.
- Token strategy: design-system как source, дискретные сеты через @media.
- Brand rules: ссылка на `design-system/README.md`.
- Куда катить backend: `/back` под Docker compose в будущем, API через `front/src/lib/api.ts`.

## Implementation guidance

- **Z-index стек**: curtain 1000, mobile-tabbar 200, top-nav 50, content 1. Если что-то не показывается — проверить порядок.
- **Sticky top-nav vs scroll**: на десктопе nav стикает наверху; на mobile — нету top-nav, есть fixed-bottom tab-bar. На mobile body должно иметь `min-height: 100dvh` чтобы фон не обрезался под tab-bar.
- **Curtain поверх nav**: rendering order в `BaseLayout` — `<TopNav />` рендерится **до** `<slot />`, а внутри slot — curtain. Curtain `position: fixed; z-index: 1000;` будет перекрывать TopNav. Это и нужно.
- **Active-pill на десктопе**: совпадает по ширине с padding 14px-34px. На tablet — компактнее (10px-24px). Проверьте, не уезжает ли строка nav при tap на короткую ссылку («2025»).
- **Mobile-tabbar safe-area**: `env(safe-area-inset-bottom)` работает только если `<meta name="viewport" ... viewport-fit=cover>`. Это уже в BaseLayout — проверить.
- **External links на /contacts**: `target="_blank"` + `rel="noopener noreferrer"` для https-ссылок.
- **Lighthouse PWA**: не цель этой фазы. SEO + accessibility + performance — да.
- **Skip-link** для accessibility: добавить в BaseLayout `<a href="#content" class="sr-only sr-only-focusable">Перейти к контенту</a>` перед `<TopNav />`. И стиль `.sr-only-focusable:focus { position: static; ...}` чтобы фокус был виден.

## Don't do

- **Не подключать analytics** (Plausible, Yandex.Metrika) — это решение пользователя.
- **Не настраивать CDN / Cloudflare** — это серверный слой, вне scope фазы.
- **Не настраивать SSL** — это reverse-proxy уровня (nginx / Caddy у пользователя на сервере).
- **Не вводить i18n** — сайт русскоязычный, без переключения языков.
- **Не делать contact form** — только ссылки. Форма требует backend, его пока нет.
- **Не оптимизировать вращение `pkBob` маркера в hero** дополнительно — фаза 02 это уже решила.

## Верификация

`verify.md`.
