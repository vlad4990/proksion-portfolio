# Phase 03 — About

## TL;DR

Наполнить главную страницу `/` контентом «ОБО МНЕ»: после занавеса — два маскированных фото слева, справа интро + блоки «ОПЫТ РАБОТЫ» (LOFTY + КОПИРКА) + «ОБРАЗОВАНИЕ». На мобильных — стек: фото сверху, текст ниже. Контент типизирован в `front/src/data/`, фото через `astro:assets`.

## Prerequisites

- Фаза 02 завершена и провалидирована.
- На `/` после занавеса виден `<main id="content">` с placeholder-абзацем.
- Шрифты, токены, изображения через `astro:assets` уже работают.

## Контекст, который нужно загрузить

| Путь | Зачем |
|---|---|
| `_legacy/AboutSection.jsx` | Десктоп-структура: композиция двух колонок, компоненты JobEntry и EducationEntry, текстовые константы (LOFTY/КОПИРКА bullets, education degrees). |
| `_legacy/MobileAbout.jsx` | Mobile-композиция reference: стек, размеры заголовков, отступы. |
| `design-system/preview/comp-job-entry.html` | Эталон того, как выглядит запись о работе (если файл есть в preview). |
| `design-system/preview/comp-marker.html` / `comp-sidebar.html` | Эталоны микроэлементов (если будем использовать маркеры в bullets). |
| `design-system/assets/mask-about-1.svg`, `mask-about-2.svg` | Маски для фото about. |
| `design-system/assets/photo-masked-1.png`, `photo-masked-2.png` | Уже замаскированные PNG. **NB**: в оригинале использовались именно они (с впечённой маской), а не raw photo + svg-mask. Сверить визуально, что лучше: использовать pre-masked PNG (проще) или применять mask-image к raw `photo-about-1.jpg` / `photo-about-2.png`. Решение принять по месту, исходя из визуального качества. |
| `design-system/README.md` (CONTENT FUNDAMENTALS) | Тон, регистры, английские вкрапления, отсутствие точек в bullets. |
| `design-system/colors_and_type.css` | Токены `--t-header-1` (Опыт работы / Образование, 80px), `--t-header-2` (роль, 40px), `--t-sub-section` (degree, 32px), `--t-body`, `--accent`, `--accent-dim` (для «КОПИРКА» как «прошлая» роль). |

## Архитектурные решения (повтор)

- About — server-rendered `.astro`, **без React-островов**. Это статичный текст.
- Контент в типизированных файлах `front/src/data/experience.ts` и `front/src/data/education.ts`, не inline в компонентах.
- Композиция:
  - **Desktop (≥1024)**: слева два маскированных фото (наложение, лёгкая ротация), справа колонка с текстом ~1150px шириной.
  - **Tablet (768–1023)**: сужаем text-колонку, фото становятся меньше или одно из них прячется.
  - **Mobile (<768)**: стек — фото сверху (одно), текст под ним. Второе фото опционально внутри текстовой полосы или скрыто.
- Photos через `astro:assets` с responsive `widths` и lazy-loading (выше LCP это не критично — hero уже отдал).

## Deliverables

### A. Data

`front/src/data/experience.ts`:

```ts
export type JobEntry = {
  company: string;
  role: string;
  duration: string;
  bullets: readonly string[];
  dim?: boolean;
};

export const experience: readonly JobEntry[] = [
  {
    company: 'LOFTY.',
    role: 'ГРАФИЧЕСКИЙ ДИЗАЙНЕР',
    duration: '1.5 ГОДА',
    bullets: [
      'Работа с креативами: баннеры, оформление smm-постов',
      'Обновление и формирование фирменного стиля для smm и коммуникация с отделом маркетинга',
      'Подготовка материалов на сайт, передача материалов продуктовому дизайну и коммуникация с отделом разработки',
      'Работа с UI-kit компании, разработка макетов под ивенты на сайт, создание витрин под продукты, общение с разработчиками',
      'Оптимизация работы графического дизайна, точечное внедрение ИИ, создание шаблонов для ведения каналов и контента',
      'Планирование и распределение нагрузки, ответственность за качество выполняемых задач',
    ],
  },
  {
    company: 'КОПИРКА',
    role: 'ГРАФИЧЕСКИЙ ДИЗАЙНЕР',
    duration: '6 МЕСЯЦЕВ',
    dim: true,
    bullets: [
      'Создание дизайн-проектов / дизайн и верстка сувенирной и полиграфической продукции',
      'Фото на документы, ретуширование, печать фотографий',
      'Консультирование клиентов по услугам, прямая работа с заказчиками',
      'Периодическое выполнение копировальных и печатных работ, передача заказов на производство',
      'Создание визиток/брошюр',
      'Разработка печатей/штампов по заказу и оттиску',
    ],
  },
];
```

`front/src/data/education.ts`:

```ts
export type EducationEntry = {
  degree: string;
  school: string;
};

export const education: readonly EducationEntry[] = [
  {
    degree: 'Художник-мастер, педагог.',
    school: 'Колледж декоративно-прикладного искусства им. Карла Фаберже',
  },
  {
    degree: 'Монументальная живопись',
    school: 'РГУ ИМ. А.Н.КОСЫГИНА, Институт искусств',
  },
];
```

`front/src/data/about.ts`:

```ts
export const aboutIntro =
  'С детства я рисую, играю в компьютер, занимаюсь музыкой и полностью ' +
  'погружена в творчество по сей день: люблю комиксы, фильмы, путешествия, ' +
  'активно веду скетчбук, пробую себя в разных хобби.';
```

### B. Компоненты

`front/src/components/about/JobEntry.astro`:

```astro
---
import type { JobEntry } from '@/data/experience';
interface Props { entry: JobEntry; }
const { entry } = Astro.props;
---

<article class="job">
  <header class="job__head">
    <span class={`job__company ${entry.dim ? 'job__company--dim' : ''}`}>
      {entry.company}
    </span>
    <span class="job__role">{entry.role}</span>
    <span class="job__duration">{entry.duration}</span>
  </header>
  <ul class="job__bullets">
    {entry.bullets.map(b => <li>{b}</li>)}
  </ul>
</article>

<style>
  .job { margin-bottom: var(--sp-8); }

  .job__head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px 32px;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: var(--t-header-2);
    text-transform: uppercase;
    letter-spacing: var(--tracking-caps);
    line-height: 1;
    margin-bottom: var(--sp-5);
  }

  .job__company { color: var(--accent); }
  .job__company--dim { color: var(--accent-dim); }
  .job__role { color: var(--fg-muted); }
  .job__duration { margin-left: auto; color: var(--fg-muted); }

  .job__bullets {
    margin: 0;
    padding: 0;
    list-style: none;
    font-family: var(--font-body);
    font-weight: 700;
    font-size: var(--t-body);
    line-height: 1.27;
    color: var(--fg-muted);
  }

  .job__bullets li { margin-bottom: 6px; }

  @media (max-width: 767px) {
    .job__head {
      gap: 2px 12px;
      font-size: var(--t-sub-section); /* 17px на mobile через переопределение */
      line-height: 1.2;
      margin-bottom: var(--sp-3);
    }
    .job__duration { margin-left: 0; }
    .job__bullets { line-height: 1.5; }
    .job__bullets li { margin-bottom: 4px; }
  }
</style>
```

Сверьте mobile-головник с `_legacy/MobileAbout.jsx`: там `company` и `duration` в одной строке (font-display 17px), а `role` — отдельной строкой ниже (font-display 13px). Если визуально лучше так — реструктурируйте JSX.

`front/src/components/about/EducationEntry.astro`:

```astro
---
import type { EducationEntry } from '@/data/education';
interface Props { entry: EducationEntry; }
const { entry } = Astro.props;
---

<div class="edu">
  <div class="edu__degree">{entry.degree}</div>
  <div class="edu__school">{entry.school}</div>
</div>

<style>
  .edu { margin-bottom: var(--sp-7); }

  .edu__degree {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: var(--t-sub-section);
    text-transform: uppercase;
    letter-spacing: var(--tracking-caps);
    color: var(--fg-muted);
    margin-bottom: var(--sp-3);
  }

  .edu__school {
    font-family: var(--font-body);
    font-weight: 700;
    font-size: var(--t-body);
    color: var(--fg-muted);
  }
</style>
```

`front/src/components/about/MaskedPhoto.astro`:

```astro
---
import { Image } from 'astro:assets';
import type { ImageMetadata } from 'astro';

interface Props {
  src: ImageMetadata;
  alt?: string;
  /** SVG mask path under /public, e.g. "/assets/mask-about-1.svg" */
  mask: string;
  rotate?: number;
  class?: string;
}

const { src, alt = '', mask, rotate = 0, class: className } = Astro.props;
---

<div class:list={['mphoto', className]} style={`--rot: ${rotate}deg;`}>
  <Image
    src={src}
    alt={alt}
    widths={[480, 720, 960, 1280]}
    sizes="(max-width: 767px) 90vw, 40vw"
    formats={['avif', 'webp']}
    loading="lazy"
    class="mphoto__img"
  />
</div>

<style>
  .mphoto {
    position: relative;
    transform: rotate(var(--rot));
    transform-origin: center;
    pointer-events: none;
  }

  .mphoto__img {
    display: block;
    width: 100%;
    height: auto;
  }
</style>
```

Если решено применять SVG-маску динамически (вариант 2 решения, см. контекст) — добавьте `mask-image: url(...);` к `.mphoto__img`. Но если используем pre-masked PNG (`photo-masked-1.png`, `photo-masked-2.png`) — маска уже в PNG, и `mask` prop не нужен. **Рекомендую начать с pre-masked PNG** — проще, корректнее по визуалу. Если визуал хуже оригинала — переключаемся на raw photo + SVG mask.

`front/src/components/about/About.astro`:

```astro
---
import { aboutIntro } from '@/data/about';
import { experience } from '@/data/experience';
import { education } from '@/data/education';
import JobEntry from './JobEntry.astro';
import EducationEntry from './EducationEntry.astro';
import MaskedPhoto from './MaskedPhoto.astro';
import photo1 from '@/assets/photo-masked-1.png';
import photo2 from '@/assets/photo-masked-2.png';
---

<section class="about">
  <aside class="about__photos" aria-hidden="true">
    <MaskedPhoto src={photo1} rotate={-3} class="about__photo about__photo--1" mask="" />
    <MaskedPhoto src={photo2} rotate={2.5} class="about__photo about__photo--2" mask="" />
  </aside>

  <div class="about__text">
    <p class="about__intro">{aboutIntro}</p>

    <h2 class="about__heading">Опыт работы</h2>
    {experience.map(entry => <JobEntry entry={entry} />)}

    <h2 class="about__heading">Образование</h2>
    {education.map(entry => <EducationEntry entry={entry} />)}
  </div>
</section>

<style>
  .about {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 600px) minmax(0, 1fr);
    gap: var(--sp-9);
    padding: calc(var(--sp-10) + var(--sp-8)) var(--page-pad) var(--sp-10);
    max-width: var(--page-w);
    margin: 0 auto;
  }

  .about__photos {
    position: relative;
    min-height: 1200px;
  }

  .about__photo {
    position: absolute;
    width: 100%;
  }

  .about__photo--1 {
    top: 80px;
    left: -120px;
    max-width: 700px;
  }

  .about__photo--2 {
    top: 760px;
    left: -40px;
    max-width: 1100px;
  }

  .about__text {
    max-width: 1150px;
    padding-top: var(--sp-7);
  }

  .about__intro {
    font-family: var(--font-body);
    font-weight: 700;
    font-size: 24px;
    line-height: 1.33;
    color: var(--fg);
    margin: 0 0 var(--sp-10);
  }

  .about__heading {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: var(--t-header-1);
    text-transform: uppercase;
    letter-spacing: var(--tracking-caps);
    color: var(--fg-muted);
    line-height: 1;
    margin: var(--sp-10) 0 var(--sp-8);
  }

  .about__heading:first-of-type { margin-top: var(--sp-9); }

  /* Tablet — сужаем фото-колонку */
  @media (max-width: 1279px) {
    .about { grid-template-columns: minmax(0, 400px) minmax(0, 1fr); gap: var(--sp-7); }
    .about__photo--1 { left: -60px; max-width: 480px; }
    .about__photo--2 { left: -20px; max-width: 720px; top: 540px; }
    .about__photos { min-height: 900px; }
  }

  /* Mobile — стек */
  @media (max-width: 767px) {
    .about {
      grid-template-columns: 1fr;
      padding: var(--sp-8) var(--page-pad);
      gap: 0;
    }

    .about__photos {
      min-height: auto;
      margin-bottom: var(--sp-7);
    }

    .about__photo {
      position: relative;
      top: auto;
      left: auto;
      max-width: 100%;
    }

    .about__photo--2 { display: none; }

    .about__text { padding-top: 0; }

    .about__intro { font-size: 16px; }
  }
</style>
```

Координаты фото — стартовые из `_legacy/AboutSection.jsx`. Подгонять визуально.

### C. Page

`front/src/pages/index.astro` обновить — заменить placeholder-абзац на `<About />`:

```astro
---
import BaseLayout from '@/layouts/BaseLayout.astro';
import HeroComposition from '@/components/hero/HeroComposition.astro';
import { Curtain } from '@/components/hero/Curtain';
import About from '@/components/about/About.astro';
---

<BaseLayout title="PROKSION — Kristina · портфолио">
  <Curtain client:load>
    <HeroComposition />
  </Curtain>

  <main id="content">
    <About />
  </main>
</BaseLayout>
```

### D. Page heading semantics

`<About>` начинается с `<h2>`, что нарушает heading-hierarchy (нет `<h1>` на странице после dismiss). Варианты:

1. Добавить `<h1 class="sr-only">Кристина — графический дизайнер</h1>` в начало `<main>`.
2. Сделать первый `<h2>` (`Опыт работы`) — `<h1>` визуально неотличимым (через class, не через тэг). Это менее SEO-корректно.

**Рекомендую вариант 1**. Добавить utility-class:

```css
/* в global.css */
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

И в `index.astro`:

```astro
<main id="content">
  <h1 class="sr-only">Кристина — графический дизайнер. PROKSION портфолио.</h1>
  <About />
</main>
```

## Implementation guidance

- **Pre-masked PNG vs raw + SVG mask**: pre-masked даёт лучший визуал и проще. SVG-маска поверх raw — гибче (можно подменить маску без правки фото), но возможны артефакты на ratio. Стартуйте с pre-masked, переключайтесь если есть конкретная проблема.
- **Absolute-positioned photos in grid item**: `.about__photos` имеет `min-height` чтобы grid-item не сколлапсировался. На каждом брейке считайте `min-height` от композиции фото вручную — это часть дизайна.
- **Headings line-height**: Stengazeta при `line-height: 1` визуально хорошо. При меньшем (0.92) — может ломать descenders на mobile. Тестируйте.
- **Long text + Kanit на mobile**: 14px / line-height 1.5 даёт ~21px высоту строки. Если читается тесно — увеличивайте до 1.6.
- **Перенос строк**: в bullets `LOFTY` встречаются длинные предложения. Они должны переноситься естественно. Никаких `white-space: nowrap`.
- **Color of `dim` company**: должно быть `var(--accent-dim)` = `rgba(166,35,35,0.7)`. Не `var(--accent)` с `opacity`, потому что opacity ослабит и border, и текст; нужен только цвет.
- **`role` на mobile**: в `_legacy/MobileAbout.jsx` структура «company + duration» в одной строке, «role» — мелким display ниже. Если перенос строк в одной строке выглядит криво — реструктурируйте JSX, не пытайтесь решить CSS-ом одной media.

## Don't do

- **Не добавлять React-острова** в about-секцию. Если потребуется анимация-on-scroll, выносить в отдельный остров после согласования.
- **Не оптимизировать SEO-meta** сейчас (open graph, twitter cards) — фаза 05.
- **Не вёрстать `<TopNav>` / `<MobileTabBar>`** — это фаза 05. Сейчас на странице нет навигации, и это OK.
- **Не вставлять разделители** между секциями (border, hr) — design-system запрещает.
- **Не использовать иконки** для bullet-points. В бренде — пустые строки, layout = список.

## Верификация

`verify.md`.
