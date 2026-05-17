# Phase 02 — Verification

## A. Файлы созданы

```bash
find /Users/vtorgovcev/Downloads/portfolio/front/src/components/hero -type f
```

- [ ] `front/src/components/hero/HeroComposition.astro`
- [ ] `front/src/components/hero/Curtain.tsx`
- [ ] `front/src/components/hero/Curtain.css`
- [ ] `front/src/pages/index.astro` импортит и использует обе сущности.
- [ ] `front/src/assets/` существует как симлинк на `../../design-system/assets` (для bundled-import изображений).

## B. Type-check + build

```bash
cd /Users/vtorgovcev/Downloads/portfolio/front
npm run type-check
npm run build
```

- [ ] `type-check` — exit 0.
- [ ] `build` — exit 0, в `dist/client/` появились оптимизированные варианты `photo-hero-portrait.*.webp` и `.avif` (проверить: `find dist -name "photo-hero-portrait*"`).
- [ ] В `dist/client/_astro/` есть JS-чанк с Curtain (его hash-имя), размер **< 5 kb gzipped**. Проверить:
  ```bash
  cd /Users/vtorgovcev/Downloads/portfolio/front
  find dist/client/_astro -name "*.js" -exec ls -la {} \;
  ```

## C. Главная страница — визуальная проверка в dev

```bash
cd /Users/vtorgovcev/Downloads/portfolio/front
npm run dev
```

Открыть `http://localhost:4321/` **в Incognito** (чтобы sessionStorage был пустой). Поочерёдно проверять разные ширины viewport через DevTools:

### Desktop (1920×1080)
- [ ] Сразу виден полноэкранный hero, фон `#141414`.
- [ ] Слева сверху — красная надпись «PROKSION» (Stengazeta, ~100px). Цвет — `#a62323`, не другой оттенок.
- [ ] Под ней — outlined `PORT` / `FOLIO` (Stengazeta, ~380px), цвет fill `#e4e4e4`, обводка `~2.4px` чёрная.
- [ ] Справа — графитовая (#434145) колонка с маскированным портретом. Маска — неровные «рваные» края, не круг и не rounded rectangle.
- [ ] Внизу слева — маленький красный пиксель-маркер, повёрнут на 90°, **бобит** (анимация ~1.6s).
- [ ] Скролл заблокирован (колесо не двигает страницу).

### Tablet (1024×768)
- [ ] Композиция остаётся «две колонки» (графитовая панель справа).
- [ ] Lockup и wordmark пропорционально уменьшились (типография по `--t-hero: 72px`).

### Mobile (768×1024 и 360×640)
- [ ] Композиция перестроилась в **стек**: wordmark сверху, lockup ниже, графитовая панель с портретом снизу (нижняя ~48dvh).
- [ ] На 360 шрифт hero ещё меньше (`--t-port-folio: 108px`, `--t-hero: 38px`).
- [ ] Маркер по центру внизу, бобит вверх-вниз (не вправо-влево).
- [ ] Никаких горизонтальных скроллов.

## D. Curtain — поведение

Один проход на десктопе (1280+):

- [ ] Curtain видим, body overflow заблокирован.
- [ ] Прокрутка колесом → curtain уезжает вверх (`translateY(-100%)`) за ~600ms, под ним видно `<main>` с placeholder-абзацем.
- [ ] После этого `document.documentElement.style.overflow === ''` (обычный скролл вернулся).
- [ ] DevTools → Application → Session Storage: ключ `proksion:curtain:dismissed = "1"`.
- [ ] **Reload** страницы (F5): curtain **больше не появляется**. Сразу виден `<main>`.
- [ ] Перейти на `http://localhost:4321/projects` (вручную через URL): curtain не появляется (его там и не должно быть).
- [ ] Очистить sessionStorage / закрыть-открыть Incognito → curtain снова появляется.

Touch / keyboard:

- [ ] DevTools → Toggle device toolbar (touch-эмуляция) → тап по curtain → уезжает.
- [ ] Нажатие любой клавиши → уезжает.

## E. Accessibility

- [ ] DevTools → Lighthouse → accessibility audit на `/` (после dismiss curtain) — score ≥ 95. Если меньше — посмотреть конкретные warnings.
- [ ] `<Curtain>` имеет `role="button"`, `aria-label="Войти на сайт"`, `tabIndex={0}` (проверить в Elements).
- [ ] Все декоративные элементы (lockup, marker, portrait) помечены `aria-hidden="true"` или `alt=""`.
- [ ] `prefers-reduced-motion: reduce` отключает анимацию маркера и заменяет slide-up на fade-out:
  - DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce` → проверить.

## F. Performance

DevTools → Network → throttling «Fast 3G» → reload главной:

- [ ] First Contentful Paint < 1.5s.
- [ ] Largest Contentful Paint < 2.5s (LCP = портрет в hero).
- [ ] Portrait отдаётся как `avif` или `webp` (а не оригинальный 5MB png). В Network посмотреть тип файла.
- [ ] Total JS на странице < 15 kb gzipped. Проверить через Network → JS → суммировать gzipped sizes.

Lighthouse performance audit на `/`:
- [ ] Score ≥ 90 (mobile preset).

## G. Prod-сборка через Docker

```bash
cd /Users/vtorgovcev/Downloads/portfolio
docker compose up --build
```

- [ ] `http://localhost:4321/` отдаёт правильно собранную страницу с hero.
- [ ] Optimized images отдаются (`/assets/photo-hero-portrait.png` либо не используется напрямую, либо отдаётся, но в Hero виден `_astro/photo-hero-portrait.{hash}.webp`).
- [ ] `/assets/mask-hero.svg` отдаётся (200 OK).
- [ ] Внутри одной browser session curtain показывается только на первой загрузке.

## H. Контент под занавесом

- [ ] В DOM при `phase: gone` curtain удалён (`return null`), а не просто скрыт CSS — проверить через Elements.
- [ ] `<main id="content">` есть в DOM **до** dismiss занавеса (т.е. он рендерится сервером, но прячется только overflow body).

## I. Бренд-соответствие

- [ ] **Никаких** новых hex-цветов сверх токенов — `grep -rE "#[0-9a-fA-F]{3,6}" front/src/components/hero` должен показать только `#000` (если есть в mask-stroke) или путь к ассету. Все прочие цвета через `var(--*)`.
- [ ] **Никаких эмодзи** в коде или UI.
- [ ] **Никаких** drop-shadow, gradient, blur, glass.
- [ ] Шрифты — только Stengazeta (display) и Kanit (если где-то есть body-текст в hero).

## Если что-то не сошлось

Конкретный пункт + симптом. Если визуально «hero выглядит криво» — приложить скриншот при разной ширине viewport.
