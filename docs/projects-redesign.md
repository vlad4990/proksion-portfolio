# PROKSION — редизайн листинга проектов (спецификация)

Источник дизайна — `front/1111.pen` (Pencil). Фреймы:

| Node ID  | Что                                              |
| -------- | ------------------------------------------------ |
| `tVnqG`  | Корневая `/projects` — desktop 1440 (tier `xl`)  |
| `N8NrSi` | Корневая `/projects` — mobile 390                |
| `h16xA`  | Страница категории `/projects/:cat` — desktop    |
| `fQvBp`  | Страница категории — mobile                      |
| `ZRSQk`  | Дизайн-токены (документация системы)             |
| `zZTSg`  | Reusable-компонент «Медиа-заглушка» (тайл)       |

Смотреть дизайн — **только** через Pencil MCP (`batch_get`, `get_screenshot`,
`get_variables`); `.pen` зашифрован, Read/Grep бесполезны.

Этот документ — источник правды по редизайну; базовая архитектура — в
[`architecture.md`](./architecture.md) (§N-ссылки ниже — на неё). Задачи — `tasks/13–19`.

---

## 1. Принятые продуктовые решения (зафиксированы с владельцем)

1. **Чипы на корневой `/projects` — глобальные теги-фильтры.** Новая сущность `tag`
   (m2m с работами, CRUD в админке). При выбранном теге **секции категорий остаются**,
   но вместо кураторской витрины в каждой секции показываются работы категории с этим
   тегом; секции без совпадений скрываются. Таб «ВСЕ» возвращает витрины.
   Тег синхронизируется в URL: `/projects?tag=<slug>`.
2. **Витрина секций — кураторская.** Kristina в админке отмечает работы для витрины
   раздела и задаёт порядок; первая работа = hero-слот. В БД — `work.featured_order`.
   Fallback: если витрина категории пуста — первые работы категории по sort_order
   (страница не должна быть пустой до кураторства).
3. **Канонический URL работы — всегда с подкатегорией**: `/projects/:cat/:sub/:work`.
   Модалка с таба «ВСЕ» тоже открывает канонический путь (закрытие возвращает на
   предыдущий листинг через navigate назад). Двух URL на одну работу нет; коллизия
   слагов (`uiux-keysy/boytsovskiy-klub` — и подкатегория, и работа) не стреляет.
   `:work` переводится с числового id на **слаг** (см. §5).
4. **Скоуп хрома:** новый футер (CTA «ЕСТЬ ЗАДАЧА ПОД ГРАФИКУ?» + email + Telegram +
   соцсети) — в скоупе, на страницах `/projects*` обоих деревьев. Шапка/навигация —
   как есть; мобильные Mobile Header / Status Bar / фиксированный Tab Bar из дизайна
   **не делаем** (остаётся текущий `MobileTabBar`).
5. **Листинг второго уровня — инфинити-скролл** (не «Показать ещё»), с счётчиком
   «ПОКАЗАНО N ИЗ M». Кнопка из дизайн-фрейма заменяется сентинелом.
6. **Модалка работы остаётся как есть** (карусель, `?img=`), меняется только источник
   параметра (`:work` = слаг) + редирект со старых числовых URL.

---

## 2. Анатомия страниц (из дизайна)

### 2.1 Корневая `/projects` (desktop `tVnqG`)

Сверху вниз (всё в паддингах `--gutter`, ритм `--sp-*`):

1. **Hero** — слева: оверлайн `// ПОРТФОЛИО — ГРАФИЧЕСКИЙ ДИЗАЙНЕР` (15px, accent,
   letter-spacing 1.5), заголовок «ПРОЕКТЫ» (`--t-hero`, display, `--fg-strong`,
   ls 2, `--lh-tight`) + красный квадрат 20×20 у базовой линии, подзаголовок
   (18px, `--fg`, lh 1.4, ширина ~560px). Справа (выравнивание end): **3 стата** —
   значение (`--t-sub-section`, display, `--fg-strong`) + подпись (13px, `--fg-dim`,
   ls 1.2): «150+ / РАБОТ В АРХИВЕ», «5 / НАПРАВЛЕНИЙ», «3 ГОДА / В КОММЕРЧЕСКОМ
   ДИЗАЙНЕ». Счётчики — из API (сумма тайлов, число категорий), «3 ГОДА» и тексты —
   константы фронта.
2. **Ряд фильтров** — слева чипы-теги: «ВСЕ <total>» + по чипу на тег (label + count);
   активный чип — заливка `--accent` (label `--fg-strong` bold, count `--fg`),
   неактивный — рамка `--hairline` (label `--fg`, count `--fg-dim`); 14px, паддинг
   9×16, gap 10, радиус 0. Справа подсказка «NN РАЗДЕЛОВ ↓» (14px, `--fg-dim`).
3. **Секции категорий** (по одной на категорию, порядок = `sort_order`; верхняя
   hairline-граница, паддинг `--sp-section-top` / `--gutter`). Три варианта
   (`category.display_variant`):
   - **`showcase`** (KUPIKOD, PRESS F): голова = слева Title Line (номер `01`
     15px accent · заголовок `--t-section` display · бейдж «68 РАБОТ» — 13px
     `--fg-dim`, рамка hairline, паддинг 5×12) + описание (16px, ширина ~620);
     справа (end): мета-роль и годы (13px `--fg-dim`), ссылка «ВСЕ РАБОТЫ ↗»
     (14px bold accent → `/projects/:cat`). Витрина — **выровненные ряды
     (justified)**: тайл несёт `aspect-ratio` и `--ar` (= w/h из API), ряд — flex
     с `flex-grow: var(--ar)`; ширина тайла ∝ пропорциям картинки, высота ряда
     выводится сама, картинка видна целиком, **без обрезки** (изменение
     2026-07-29; в дизайн-фрейме слоты были фиксированной высоты с cover —
     от обрезки отказались по требованию заказчика). **Row A** — hero-тайл
     (с подписью-пилюлей внизу слева: фон `--bg`, 12px, текст = title работы)
     + до 2 тайлов; **Row B** — до 4 тайлов; зазоры `--tile-gap`.
   - **`strip`** (РИСОВАНИЕ, SKETCHBOOK): лёгкая голова = Title Line + справа
     однострочное описание (13px `--fg-dim`, из `category.description`); один
     выровненный ряд — до 4 работ, при 5+ ряд плотнее (и потому ниже).
   - **`cards`** (UI/UX КЕЙСЫ): лёгкая голова + ряд из карточек (рамка hairline):
     превью-тайл с натуральной пропорцией картинки (без обрезки) + текст
     (паддинг 24): title работы (`--t-title` bold
     `--fg-strong`), description работы (16px), мета-ряд (13px: `--fg-dim`
     подпись + «СМОТРЕТЬ КЕЙС ↗» accent bold → модалка работы).
   - Число тайлов витрины = длине кураторского списка (дизайн-ориентиры: showcase 7,
     strip 4–5, cards 2); фронт раскладывает по шаблону варианта.
   - **Режим тега**: вместо витрины — masonry-грид работ категории с выбранным тегом
     (тот же тайл-компонент, что на странице категории), без пагинации; секции с
     0 совпадений скрыты; головы секций сохраняются.
4. **Футер** — CTA-заголовок (`--t-header-1` display), ряд: email (display,
   `--t-sub-section`, accent) + кнопка «НАПИСАТЬ В TELEGRAM ↗» (заливка accent,
   паддинг 14×28); нижний бар: «© PROKSION — 2026» + соцссылки (13px), верхняя
   hairline.

### 2.2 Корневая — mobile (`N8NrSi`)

Контент под текущей шапкой: hero (оверлайн `--t-small-mob`, титул `--t-section-mob`
+ квадрат, подзаголовок `--t-body-mob`, статы — ряд из 3 колонок `fill`);
горизонтально скроллящийся ряд чипов (паддинг 8×14, `--t-chip-mob`, без переноса,
скроллбар скрыт); секции (паддинг 32 / `--mob-pad`): Title Line + описание +
мета-ряд (мета `--t-small-mob` + «ВСЕ РАБОТЫ ↗» `--t-job-role-mob` bold) + витрина
(те же выровненные ряды, что на десктопе — без обрезки): `showcase` = hero-тайл на
всю ширину (натуральная пропорция) + выровненные пары (`--tile-gap-mob`);
`strip` = пары (≤4) либо тройка (5+); `cards` = карточки в столбик. Футер: CTA
(`--t-section-mob`), email, TG-кнопка h52 на всю ширину, соцсети + ©.

### 2.3 Страница категории `/projects/:cat[/:sub]` (desktop `h16xA`)

1. **Панель крошек** (паддинг 16 / `--gutter`, нижняя hairline-soft): «ГЛАВНАЯ /
   ПРОЕКТЫ / KUPIKOD» (13px `--fg-dim`, текущая — `--fg-strong` bold; ссылки на `/`
   и `/projects`) + справа «ОБНОВЛЕНО — ИЮЛЬ 2026» (13px; из `category.updated_max`,
   месяц по-русски в верхнем регистре).
2. **Голова** (паддинг `--sp-block-sm` / `--gutter`): слева оверлайн «// РАЗДЕЛ NN —
   <KICKER>» (15px accent), Title Row: заголовок `--t-header-1` display + красный
   квадрат 16 + бейдж «68 РАБОТ»; описание (18px, ширина ~640,
   `description_long || description`). Справа (end): мета-роль, годы, «НАПИСАТЬ ПО
   ПРОЕКТУ ↗» (14px bold accent → `/contacts`).
3. **Ряд суб-фильтров**: чипы-табы подкатегорий «ВСЕ <N>» + по чипу на подкатегорию
   (label = title uppercase, count) — те же стили, что чипы корневой. Выбор таба
   синхронизируется в URL: «ВСЕ» = `/projects/:cat`, таб = `/projects/:cat/:sub`.
   Справа — счётчик «ПОКАЗАНО N ИЗ M» (14px `--fg-dim`), обновляется по мере
   догрузки.
4. **Masonry-грид** — `react-masonry-css`, те же `breakpointCols`
   (desktop `{default:4, 1399:3, 1099:2}`, mobile `{default:2}`) и зазоры
   `--tile-gap(-mob)`, что сейчас; тайл — текущий `<Link><picture>` с
   `aspect-ratio` (без обрезки).
5. **Инфинити-скролл** — IntersectionObserver-сентинел под гридом; порция = 24;
   на время догрузки — мини-индикатор (скелетон-тайлы); когда всё показано —
   сентинел неактивен. Работает и на «ВСЕ», и на табах подкатегорий.
6. **Футер** — общий (см. 2.1.4).

### 2.4 Страница категории — mobile (`fQvBp`)

Крошки (12 / `--mob-pad`) → голова (24 / `--mob-pad` / 20: оверлайн, титул
`--t-section-mob` + квадрат + бейдж, описание, мета-ряд с «НАПИСАТЬ ПО ПРОЕКТУ ↗») →
горизонтальный скролл чипов-табов → счётчик «ПОКАЗАНО N ИЗ M» (`--t-small-mob`) →
masonry 2 колонки → инфинити-скролл → футер.

---

## 3. Дизайн-токены

Переменные `pk-*` из Pen-файла — **зеркало существующего `front/src/styles/tokens.css`**
(дизайн строился на нём): палитра `pk-ink-*`/`pk-paper-*`/`pk-red-*` = `--c-*`,
семантика/тиры/мобильные токены совпадают 1:1. Шрифты на канвасе — стенд-ины
(Oswald/Kanit вместо локальных Stengazeta/Kanit-Cyrillic) — **игнорировать**,
`@font-face` не меняется. Переменные без префикса `pk-` в Pen-файле (`accent #2457FF`,
`acid`, `night*`, Geist и т.п.) — мусор дефолтной палитры Pencil, **не переносить**.

Реально новые токены (компонентные размеры, по тирам не меняются):

```css
--t-overline: 15px;  /* оверлайны «// …» */
--t-chip:     14px;  /* чипы, ссылки-действия, счётчик показа */
--t-meta:     13px;  /* мета-строки, крошки, бейджи, подписи */
--t-desc:     16px;  /* описание секции на корневой, текст карточек */
--t-lead:     18px;  /* подзаголовок hero, описание категории */
--chip-pad:      9px 16px;
--chip-pad-mob:  8px 14px;
--badge-pad:     5px 12px;
--tile-caption:  12px;   /* пилюля-подпись hero-тайла витрины */
```

Мобильные аналоги уже есть (`--t-chip-mob` 14, `--t-small-mob` 11 и т.д.).

---

## 4. Данные: миграция `0002`

```sql
-- категория: контент секции/страницы
ALTER TABLE category ADD COLUMN kicker           TEXT;  -- «КОММЕРЧЕСКАЯ ГРАФИКА» (оверлайн без номера)
ALTER TABLE category ADD COLUMN meta_role        TEXT;  -- «SMM · ПРОМО-ГРАФИКА»
ALTER TABLE category ADD COLUMN period           TEXT;  -- «2023 — 2026»
ALTER TABLE category ADD COLUMN description_long TEXT;  -- полный текст для страницы категории
ALTER TABLE category ADD COLUMN display_variant  TEXT NOT NULL DEFAULT 'showcase'
  CHECK (display_variant IN ('showcase','strip','cards'));

-- витрина: NULL = не в витрине; иначе порядок в витрине категории, 0 = hero-слот
ALTER TABLE work ADD COLUMN featured_order INTEGER;

-- глобальные теги
CREATE TABLE tag (
  id         INTEGER PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,
  title      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE work_tag (
  work_id INTEGER NOT NULL REFERENCES work(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tag(id)  ON DELETE CASCADE,
  PRIMARY KEY (work_id, tag_id)
);
CREATE INDEX idx_work_tag_tag   ON work_tag(tag_id);
CREATE INDEX idx_work_featured  ON work(featured_order) WHERE featured_order IS NOT NULL;
```

Инвариант витрины: `featured_order` уникален в пределах категории (категория работы —
через её подкатегорию); обеспечивается кодом (перезапись всего списка одной
транзакцией), не констрейнтом.

---

## 5. API-контракт (изменения)

Контракт зеркалируется в трёх местах: `back/src/dto.ts` ↔ `front/src/api/types.ts` ↔
`admin/src/api/types.ts` — менять синхронно. Строгие тесты формы тайла
(`back/src/routes/public.test.ts` — `Object.keys(tile).sort()`) обновляются вместе с dto.

### 5.1 Расширение `Tile`

```ts
Tile { id, slug, title, src, w, h, cat, sub, variants }   // + slug, + title (string|null)
```

`slug` нужен для слаговых URL модалки, `title` — для aria-label, подписи hero-тайла
витрины и списков в админке.

### 5.2 Категории

`CategoryNav` (и `GET /categories/:cat`) дополняется:

```ts
CategoryNav {
  …, kicker, meta_role, period, display_variant,        // из БД (nullable, кроме variant)
  description_long,                                     // только в /categories/:cat
  work_count,     // число ВИДИМЫХ работ категории (с картинками) = сумма по подкатегориям
  updated_max,    // max(work.updated_at) по видимым работам, ISO-строка | null
}
SubcategoryNav.work_count  // семантика меняется: тоже только видимые (с картинками) работы
```

«Видимая работа» = имеет ≥1 картинку (`queries.ts workTile`) — счётчики совпадают
с тем, что реально рендерится («ПОКАЗАНО N ИЗ M» честный).

### 5.3 Новые публичные эндпоинты

| Метод/путь        | Ответ                                                          |
| ----------------- | -------------------------------------------------------------- |
| GET `/tags`       | `TagNav[]` = `{ id, slug, title, sort_order, work_count }[]` (только видимые работы; сортировка `sort_order, id`) |
| GET `/featured`   | `FeaturedSection[]` = `{ cat: slug, curated: boolean, works: FeaturedWork[] }[]` по всем категориям в порядке `sort_order`; `FeaturedWork extends Tile { description }`. Работы: `featured_order IS NOT NULL` по порядку (`curated: true`); **fallback** — если у категории витрина пуста, первые 8 видимых работ (subcategory.sort_order → work.sort_order, `curated: false`). Признак нужен админке (отличить настроенную витрину от fallback) |

### 5.4 `GET /works` — фильтры и SQL-пагинация

```
GET /works?category=<slug>&subcategory=<slug>&tag=<slug>&offset=&limit=
```

- Все параметры-фильтры опциональны и комбинируются (subcategory требует category).
- Ответ — прежний `WorksPage { items, total, limit, offset }`; `total` — с учётом
  фильтров. Неизвестный slug фильтра → пустая страница `total: 0` (не 404).
- Реализация переезжает с обхода в памяти на **один SQL JOIN c LIMIT/OFFSET**
  (+ COUNT-запрос); сортировка `category.sort_order → subcategory.sort_order →
  work.sort_order → work.id`. Cover — как в `resolveCover` (§ныне queries.ts).
- Лимит: дефолт 24 (порция инфинити-скролла), максимум 100.
- `GET /categories/:cat/:sub` остаётся (совместимость админки), фронт листинги
  переводит на `/works?…`.

### 5.5 Admin-API

| Метод/путь                            | Body / назначение                                              |
| ------------------------------------- | -------------------------------------------------------------- |
| PATCH `/admin/categories/:id`         | + `kicker, meta_role, period, description_long` (string\|null), `display_variant` ('showcase'\|'strip'\|'cards', иначе 400) |
| POST `/admin/tags`                    | `{title*, slug?, sort_order?}` → 201 + строка `tag`. Слаг из `title` — `makeSlug` с авто-суффиксом `-2`; **явно заданный** занятый слаг → 400 (то же в PATCH) |
| PATCH `/admin/tags/:id`               | `{title?, slug?, sort_order?}`                                 |
| DELETE `/admin/tags/:id`              | `{ok:true}` (связи каскадом)                                   |
| PATCH `/admin/tags/reorder`           | `{ids:[…]}` (монтировать до `/:id`, как в reorder.ts)          |
| PATCH `/admin/works/:id`              | + `tag_ids?: number[]` — полная замена набора тегов (400 при несуществующем id) |
| PATCH `/admin/categories/:id/featured`| `{work_ids:[…]}` — работы категории (400 при чужой/несуществующей работе или **дубликате** в списке); порядок массива = `featured_order` (0 = hero); работы категории вне списка → NULL. Пустой массив = очистить витрину. `tag_ids` в ответах публичного API упорядочены по `tag.sort_order` (набор тегов работы неупорядочен) |

GET-эндпоинты админке не нужны: список тегов — публичный `/tags`, витрина —
`/featured`, работы категории — `/works?category=`, теги работы — добавить
`tag_ids: number[]` в `WorkDetailById` (или отдельное поле в detail-ответах).

### 5.6 URL фронта

| URL                              | Что                                                    |
| -------------------------------- | ------------------------------------------------------ |
| `/projects`                      | корневая: hero + чипы-теги + секции категорий          |
| `/projects?tag=<slug>`           | то же с активным тегом (фильтр содержимого секций)     |
| `/projects/:cat`                 | страница категории, таб «ВСЕ»                          |
| `/projects/:cat/:sub`            | таб подкатегории                                       |
| `/projects/:cat/:sub/:work`      | модалка работы; **`:work` = слаг** (+ `?img=`)         |
| `/projects/:cat/:sub/<число>`    | легаси-ссылки: фронт грузит по id и `replace`-редиректит на слаговый URL |

---

## 6. Фронт: компоненты

Двойное дерево сохраняется — всё делается в `components/desktop/*` и
`components/mobile/*`. Общие атомы (без разметки-развилок) — в `components/shared/`.

Новое / переделываемое:

| Компонент | Заметки |
| --- | --- |
| `shared/FilterChip` | label + count, active/inactive, элемент `<Link>`/`<button>` по месту |
| `shared/CountBadge` | «68 РАБОТ» с правильной плюрализацией (работа/работы/работ) |
| `ProjectsFooter` (desktop+mobile) | CTA + email + TG + соцсети + ©; контакты — константы (как в `ContactsScreen`) |
| `ProjectsScreen` → редизайн | hero + статы + чипы-теги + секции (3 варианта витрин + тег-режим); сайдбар удаляется |
| `MobileProjects` → редизайн | то же в мобильной вёрстке (горизонтальные чипы) |
| `CategoryScreen` (новый) | крошки + голова + чипы-табы + masonry + инфинити-скролл + счётчик |
| `MobileCategory` (новый) | то же в мобильной вёрстке |
| `api/`: `getTags`, `getFeatured`, `getCategory`, `getWorksFiltered` | + сессионные кэши по образцу `useProjects` |
| `useInfiniteWorks` | ключ = `cat/sub?/tag?`; IntersectionObserver; кэш достигнутого offset'а (возврат из модалки не сбрасывает догруженное) |
| `useWorkModal` | параметр `:work`: слаг → `GET /works/:cat/:sub/:work`; числовой → by-id + `replace` на слаговый URL |

Сохраняемые инварианты фронта: `scrollKeyFromPath` (модалка не сбрасывает скролл
листинга), aspect-ratio тайлов из `w/h`, `EAGER_TILES` для LCP, skeleton/empty/error
состояния, `npm run build` зелёный, минимум зависимостей (**новых пакетов не добавлять**,
инфинити-скролл — нативный IntersectionObserver).

---

## 7. Админка

1. **Форма категории** — новые поля: kicker, meta_role, period (инпуты),
   description_long (textarea), display_variant (select из трёх значений).
2. **Экран «Теги»** — таблица (title, slug, счётчик работ), создание/переименование/
   удаление, перестановка (reorder — как у категорий).
3. **Редактор работы** — мультивыбор тегов (чипы-переключатели по списку `/tags`).
4. **Витрина категории** — на странице категории: упорядоченный список работ витрины
   (первая = hero, пометить визуально), добавление из работ категории, удаление,
   перестановка; сохранение одним PATCH `…/featured`.

## 8. Контент после деплоя (не код)

Новые страницы содержательно пусты, пока в админке не заполнены: тексты категорий
(kicker/meta_role/period/description_long/variant), теги + разметка работ тегами,
витрины разделов. До заполнения фронт живёт на fallback'ах (витрина = первые работы,
чипы-теги скрыты при пустом `/tags`, мета-строки не рендерятся при NULL).
