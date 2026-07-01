# Phase 03 — Verification

## A. Файлы

```bash
find /Users/vtorgovcev/Downloads/portfolio/front/src/{components/about,data} -type f
```

- [ ] `front/src/data/experience.ts`
- [ ] `front/src/data/education.ts`
- [ ] `front/src/data/about.ts`
- [ ] `front/src/components/about/JobEntry.astro`
- [ ] `front/src/components/about/EducationEntry.astro`
- [ ] `front/src/components/about/MaskedPhoto.astro`
- [ ] `front/src/components/about/About.astro`
- [ ] `front/src/pages/index.astro` рендерит `<About />` внутри `<main>`.

## B. Type-check + build

```bash
cd /Users/vtorgovcev/Downloads/portfolio/front
npm run type-check
npm run build
```

- [ ] Exit 0.
- [ ] `dist/client/_astro/` содержит оптимизированные варианты `photo-masked-1.*.webp/avif` и `photo-masked-2.*.webp/avif`.
- [ ] Общий вес JS на главной не вырос относительно фазы 02 (about — pure-Astro, не должен добавить JS). Проверить размер `_astro/*.js`.

## C. Десктоп (1920×1080) — визуальная проверка

`http://localhost:4321/`, dismiss curtain, скролл вниз:

- [ ] Слева сверху — фото 1 с маской (поворот ~-3°), большое.
- [ ] Ниже — фото 2 с маской (поворот ~+2.5°), ещё больше.
- [ ] Справа — колонка с интро-параграфом (Kanit 700, 24px, серый `var(--fg)`).
- [ ] Ниже интро — `ОПЫТ РАБОТЫ` (Stengazeta 80px, off-white `var(--fg-muted)`).
- [ ] Первая job-запись `LOFTY.` — название красное (`#a62323`), роль `ГРАФИЧЕСКИЙ ДИЗАЙНЕР` серая, `1.5 ГОДА` справа в той же строке.
- [ ] 6 буллетов LOFTY — Kanit 22px, серый, без точек в конце (брендовая особенность — см. `design-system/README.md` CONTENT FUNDAMENTALS).
- [ ] Вторая job-запись `КОПИРКА` — название **dim**-красный (`var(--accent-dim)`, 70% alpha от accent), 6 буллетов.
- [ ] `ОБРАЗОВАНИЕ` ниже, два EducationEntry.

## D. Tablet (1024×768)

- [ ] Левая колонка фото сжалась, фото пропорционально меньше.
- [ ] Текст-колонка читаема, нет горизонтального скролла.
- [ ] Размер заголовков `ОПЫТ РАБОТЫ` уменьшен до `--t-header-1: 56px` (per phase-01 breakpoint set).
- [ ] Размер ролей в `job__head` уменьшен до `--t-header-2: 32px`.

## E. Mobile (360 / 480 / 768)

- [ ] Композиция — стек: одно фото сверху (фото-2 скрыто либо отображается inline), под ним текст.
- [ ] Размер заголовков: `ОПЫТ РАБОТЫ` ~44px (`--t-header-1` на mobile), интро 16px.
- [ ] `job__head` перестроен: company и duration в одной строке (~17px display), role — отдельной строкой ниже (~13px display). Сверить с `_legacy/MobileAbout.jsx`.
- [ ] Буллеты Kanit 14px (`--t-body` на mobile), line-height 1.5 — читаются комфортно.
- [ ] Никаких горизонтальных скроллов на 360.
- [ ] Padding по бокам — `var(--page-pad)` = 22px (mobile override).

## F. Контент

Открыть страницу, сравнить с `_legacy/AboutSection.jsx`:

- [ ] Интро-текст совпадает дословно с `aboutIntro` в data.
- [ ] У LOFTY все 6 буллетов на месте, в том же порядке.
- [ ] У КОПИРКИ — те же 6 буллетов, том же порядке.
- [ ] Education: «Художник-мастер, педагог.» / «Колледж декоративно-прикладного искусства им. Карла Фаберже» и «Монументальная живопись» / «РГУ ИМ. А.Н.КОСЫГИНА, Институт искусств».

## G. Accessibility

- [ ] `<h1 class="sr-only">` присутствует первым в `<main>`. Проверить через Elements + DevTools Accessibility tree.
- [ ] `<h2>` для «ОПЫТ РАБОТЫ» и «ОБРАЗОВАНИЕ» — правильный порядок (нет skip с h1 на h3).
- [ ] Фото имеют `alt=""` (декоративные, не несут информации), либо `aria-hidden="true"` на родительском `<aside>`.
- [ ] Lighthouse accessibility audit на `/` ≥ 95.

## H. Бренд

- [ ] `grep -rE "#[0-9a-fA-F]{3,6}" front/src/components/about front/src/data` — никаких hex-цветов, кроме допустимых исключений (например `#000` для outline). Всё через `var(--*)`.
- [ ] Никаких эмодзи в файлах данных или JSX.
- [ ] Никаких CSS shadow, gradient, blur.
- [ ] Шрифты — только `--font-display` (Stengazeta) и `--font-body` (Kanit).

## I. Performance

Network panel, throttling «Fast 3G»:

- [ ] LCP (для about — самое большое изображение или заголовок) < 2.5s.
- [ ] Фото about подгружаются `loading="lazy"` (не блокируют первый paint).
- [ ] Lighthouse perf ≥ 90 на mobile preset.

## J. Curtain не сломался

- [ ] В incognito первое открытие `/` — занавес. Dismiss → about-секция. Reload → about без занавеса (sessionStorage сохранил).
- [ ] Скролл по about-секции работает плавно.

## K. Prod через Docker

```bash
cd /Users/vtorgovcev/Downloads/portfolio
docker compose up --build
```

- [ ] `http://localhost:4321/` отдаёт всю about-секцию.
- [ ] Optimized photo-masked-* отдаются.
- [ ] Bundle JS не вырос.

## Если что-то не сошлось

Конкретный пункт + симптом. Особенно частая проблема — позиционирование фото на разных ширинах: приложить скриншоты с трёх viewport (360, 768, 1440), описать, где сдвигается / обрезается.
