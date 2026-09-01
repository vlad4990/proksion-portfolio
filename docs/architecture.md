# PROKSION — архитектура бэкенда и контента

> Статус: **спецификация** (план, ещё не реализовано). Источник правды для будущих задач агентов.
> Дата фиксации: 2026-06-30. Канон по фронту — `front/CLAUDE.md`; этот документ описывает
> функциональную часть (бэкенд, хранение, бэкап, интеграция с фронтом).

---

## 1. Цели и ограничения

Портфолио графического дизайнера (Кристина). Нужно перевести контент проектов
со статических заглушек в компонентах на управляемое хранилище:

- **Группировка**: категория (проект) → подкатегория (баннеры, обложки и т.п.) → работа.
- **Листинг**: каждый тайл кликабелен → полноэкранная модалка с описанием и/или
  fullscreen-картинкой и/или каруселью из нескольких картинок.
- **Шарящиеся URL**: путь до модалки и до конкретной картинки внутри карусели.
- **Слаги** для категорий/подкатегорий/работ (транслит ru→lat достаточно).
- **Хранение картинок** с авто-обработкой (thumbnail + оптимизированный full + WebP/AVIF).
- **Простая админка** (`/admin`, один редактор) для загрузки и описания работ.
- **Деплой**: один `docker-compose` на VPS, всё своё.

### Принятые решения (из обсуждения)

| Вопрос            | Решение                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| Хранение картинок | **MinIO** (S3-совместимый, self-hosted контейнер)                          |
| Обработка фото    | **Авто** на загрузке: `thumb` + `full`, форматы AVIF/WebP/JPEG-fallback    |
| Админка           | **Простая**, один редактор, защищённый роут `/admin`                       |
| Бэкап             | **rclone** → облако (Я.Диск/Dropbox/GDrive), дебаунс ~10 мин на изменение  |
| Restore           | На старте, если данных нет, тянуть БД + картинки из облака                 |

### Незыблемые рамки проекта (из `CLAUDE.md`)

- Бренд — только токены `front/src/styles/tokens.css`. Никаких новых hex/градиентов/glass.
- TypeScript strict, никаких `any`. UI-тексты — русские, display-заголовки uppercase.
- Зависимости — минимум. Бэкенд на **Bun** (как и build фронта), без тяжёлых фреймворков.
- Двойное дерево `desktop/`+`mobile/` — только для **публичного** UI во `/front` (модалка
  делается в обоих). Админка — **отдельное приложение** `/admin` (свой бандл, один layout,
  back-office), см. §8.

---

## 2. Топология (один docker-compose)

Build-time (эфемерно, во время `docker build` — НЕ рантайм-контейнеры):

```
  front/  ──[stage build-front]──┐
                                 ├──► образ caddy (вшитая статика /srv + /srv/admin)
  admin/  ──[stage build-admin]──┘   build-стадии отбрасываются автоматически
```

Runtime (три контейнера):

```
                          Internet (443)
                                │
                    ┌───────────▼────────────┐
                    │  caddy (edge)           │   ← НОВЫЙ единый сервис (TLS + роутинг)
                    │  • / → статика /srv     │   (публичный фронт, вшит в образ)
                    │  • /admin/* → /srv/admin│   (админка, вшита в образ)
                    │  • /api/*  → back:3001  │   (handle_path срезает /api)
                    │  • /media/* → minio:9000│   (публичное чтение картинок)
                    │  • HTTPS Let's Encrypt  │
                    └─────┬───────────────┬───┘
                          │ /api          │ /media
                ┌─────────▼──────┐   ┌────▼──────────────┐
                │  back (Bun/    │   │  minio            │
                │  ElysiaJS)     │◄──┤  S3-хранилище     │
                │  • REST API    │ S3│  bucket: media    │
                │  • bun:sqlite  │   │  prefix: images/  │
                │  • sharp       │   └────┬──────────────┘
                │  • rclone (CLI)│        │ volume
                │  • backup loop │        ▼  minio_data
                └────┬───────────┘
                     │ volume app_data (db.sqlite + backup-stage)
                     │
                     │ rclone (дебаунс 10 мин ↑, restore на старте ↓)
                     ▼
            ☁ Облако (Yandex.Disk / Dropbox / Google Drive)
              proksion/db/db.sqlite (+ history/)  и  proksion/media/**
```

**Рантайм-сервисы compose:** `caddy` (edge, заменяет прежний `front`-сервис), `back` (Bun),
`minio`. `front/` и `admin/` — **только build-стадии** (см. §8), в рантайме их контейнеров нет
(экономия RAM — простаивающих сборщиков не остаётся). Облако — единственная внешняя зависимость
и **только для бэкапа/restore**: при недоступности сайт продолжает работать (деградирует лишь
off-site бэкап).

**Volumes:** `caddy_data`, `caddy_config` (есть), `app_data` (SQLite + стейдж бэкапа),
`minio_data` (объекты MinIO), `rclone_config` (или секрет — токен облака).

---

## 3. Данные (SQLite через `bun:sqlite`)

SQLite — единственный файл, тривиальный консистентный бэкап (`VACUUM INTO`), нулевая
эксплуатация. Для портфолио с одним редактором и низким write-трафиком — достаточно с запасом.
`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;`. Драйвер — встроенный `bun:sqlite`
(без npm-зависимостей). Миграции — простые `.sql`-файлы, прогон на старте по порядку.

### Схема

```sql
-- Категория = «проект»
CREATE TABLE category (
  id          INTEGER PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,         -- транслит, для /projects/:cat
  title       TEXT NOT NULL,                -- русский заголовок (uppercase в UI)
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Подкатегория = «баннеры», «обложки» и т.п.
CREATE TABLE subcategory (
  id          INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES category(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,                -- уникален в рамках категории
  title       TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (category_id, slug)
);

-- Работа = единица листинга (кликабельный тайл) + контейнер карусели
CREATE TABLE work (
  id             INTEGER PRIMARY KEY,
  subcategory_id INTEGER NOT NULL REFERENCES subcategory(id) ON DELETE CASCADE,
  slug           TEXT NOT NULL,             -- уникален в рамках подкатегории
  title          TEXT,
  description     TEXT,                     -- markdown или plain (см. §7)
  cover_image_id INTEGER REFERENCES image(id) ON DELETE SET NULL,  -- thumb листинга
  sort_order     INTEGER NOT NULL DEFAULT 0,
  -- + seamless (0|1) из миграции 0003 — лента картинок в модалке без зазоров
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (subcategory_id, slug)
);

-- Картинка работы (1..N; первая/выбранная — cover)
CREATE TABLE image (
  id         INTEGER PRIMARY KEY,
  work_id    INTEGER NOT NULL REFERENCES work(id) ON DELETE CASCADE,
  key_base   TEXT NOT NULL,                 -- база ключа в MinIO (см. §5), без расширения
  width      INTEGER NOT NULL,              -- натуральный размер оригинала
  height     INTEGER NOT NULL,              -- → фронт ставит aspect-ratio, нет скачков layout
  alt        TEXT,
  lqip       TEXT,                          -- крошечный base64-плейсхолдер (опц.)
  sort_order INTEGER NOT NULL DEFAULT 0,    -- порядок в карусели
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Связь `work.cover_image_id` ↔ `image.work_id` — циклическая ссылка; создавать работу
сначала без cover, проставлять после загрузки первой картинки. `image` ссылается на `work`
с CASCADE; `cover_image_id` — `SET NULL`.

### Расширение схемы под редизайн листинга (миграция `0002`)

Редизайн `/projects` ([`projects-redesign.md`](./projects-redesign.md) §4) добавляет
поверх схемы выше — миграцией `0002_tags_featured_category_meta.sql`:

- **`category`** — контентные поля секции/страницы: `kicker`, `meta_role`, `period`,
  `description_long` (все TEXT NULL) и `display_variant`
  (`TEXT NOT NULL DEFAULT 'showcase'`, CHECK `showcase|strip|cards`) — вариант вёрстки секции.
- **`work.featured_order`** (INTEGER NULL) — позиция в **кураторской витрине** категории,
  `0` = hero-слот, `NULL` = вне витрины. Уникальность порядка в пределах категории —
  инвариант кода (`workRepo.setFeatured` переписывает весь список одной транзакцией),
  не констрейнт: категория работы известна только через её подкатегорию.
- **`tag`** (`id`, `slug` UNIQUE, `title`, `sort_order`, `created_at`, `updated_at`) —
  глобальные теги-фильтры чипов на `/projects`; **`work_tag`** (`work_id`, `tag_id`,
  PK по паре, обе стороны `ON DELETE CASCADE`) — m2m работа↔тег.
- Индексы: `idx_work_tag_tag` (выборка по тегу; выборку по работе покрывает PK `work_tag`)
  и частичный `idx_work_featured` (`WHERE featured_order IS NOT NULL`).

### Флаг «единое полотно» (миграция `0003`)

`0003_work_seamless.sql` добавляет **`work.seamless`** (`INTEGER NOT NULL DEFAULT 0`,
CHECK `seamless IN (0,1)` — SQLite без BOOLEAN): лента картинок работы в модалке идёт
**стык-в-стык, без зазора** `--tile-gap`. Нужен для работ, которые сами являются нарезкой
одного макета (кейсы, лонгриды) — зазор рвал бы картинку. Наружу поле уходит уже как
`boolean` (`WorkDetail.seamless`), в админке это чекбокс в диалоге работы.

### Слаги

Генерируются на сервере из русского `title`: транслит ru→lat (своя маленькая таблица,
без зависимостей) → lowercase → пробелы в `-` → выкинуть всё кроме `[a-z0-9-]` →
гарантировать уникальность в нужной области суффиксом `-2`, `-3`. Редактируемы в админке.
**Слаг стабилен после создания** (смена `title` его не меняет автоматически), чтобы не ломать
расшаренные ссылки. Хранится в БД.

---

## 4. URL-схема (фронт + API)

Актуальна после редизайна листинга ([`projects-redesign.md`](./projects-redesign.md) §5.6).

| URL                                         | Что                                                |
| ------------------------------------------- | -------------------------------------------------- |
| `/projects`                                 | корневая-обзор: hero + чипы-теги + секции категорий |
| `/projects?tag=<slug>`                      | то же с активным тегом (фильтр содержимого секций) |
| `/projects/:cat`                            | страница категории, таб «ВСЕ»                      |
| `/projects/:cat/:sub`                       | та же страница, таб подкатегории                   |
| `/projects/:cat/:sub/:work`                 | **модалка** работы (поверх страницы категории); `:work` — **слаг** |
| `/projects/:cat/:sub/:work?img=<imageId>`   | модалка с открытым конкретным слайдом карусели     |
| `/projects/:cat/:sub/<число>`               | легаси-ссылки: деталь грузится по id, `replace`-редирект на слаговый URL |
| `/admin`, `/admin/*`                        | **отдельное приложение** (свой бандл, не во `/front`) |

Модалка — это роут поверх листинга: при прямом заходе рендерится страница категории +
открытая модалка. Канонический путь работы ВСЕГДА содержит подкатегорию, поэтому закрытие
возвращает шагом назад по истории — на тот листинг, с которого работу открыли (это может
быть и таб «ВСЕ» `/projects/:cat`, и корневая в тег-режиме); у deep-link'а шага назад нет —
там уход на `/projects/:cat/:sub`. Конкретная картинка карусели пиннится `?img=`.
Несуществующие слаги `:cat`/`:sub` — редирект на `/projects` (не белый экран).

---

## 5. Объектное хранилище (MinIO)

- Сервис `minio` (образ `minio/minio`), данные на volume `minio_data`. Консоль наружу
  **не публикуется** (только внутренняя сеть compose).
- Bucket `media`, объекты под префиксом `images/`. На первом старте бэкенд создаёт bucket
  и ставит **public-read** политику на `images/*` (анонимный `s3:GetObject`), чтобы Caddy
  отдавал их без авторизации.
- Доступ из бэкенда — через **встроенный S3-клиент Bun** (`Bun.s3` / `Bun.S3Client` с
  `endpoint: http://minio:9000`), без npm-SDK. Если упрётся — fallback на `@aws-sdk/client-s3`.
- Картинки наружу — same-origin через Caddy: `/media/images/...` → `reverse_proxy minio:9000`
  (без CORS, кэшируется). Бэкенд байты картинок **не проксирует** — только пишет и хранит ключи.

### Раскладка ключей

```
images/{workId}/{imageId}/thumb.avif   thumb.webp   thumb.jpg     # листинг (~600–800px)
images/{workId}/{imageId}/full.avif    full.webp    full.jpg      # модалка (~2000px)
images/{workId}/{imageId}/orig.{ext}                              # оригинал (опц., для ре-генерации)
```

`image.key_base = images/{workId}/{imageId}`; публичный URL варианта =
`/media/{key_base}/{variant}.{ext}`. Фронт отдаёт `<picture>` с `<source type="image/avif">`,
`<source type="image/webp">` и `<img>`-fallback на `.jpg`.

---

## 6. Обработка картинок

Библиотека — **sharp** (libvips; лучший баланс качество/скорость, AVIF+WebP). На загрузке
(`POST .../images`) пайплайн:

1. Считать оригинал, получить натуральные `width/height` → в БД (резерв aspect-ratio на фронте).
2. Сгенерировать `thumb` (вписать в ~800px по бóльшей стороне) и `full` (~2000px), каждый в
   `avif` + `webp` + `jpg`.
3. (Опц.) LQIP — крошечный (~16–24px) blur-плейсхолдер в base64 → `image.lqip`.
4. Залить все варианты в MinIO под `key_base`, оригинал — опционально.

**Эксплуатационное замечание для реализации:** базовый образ бэкенда — `oven/bun:1`
(Debian/glibc, **не** alpine/musl) — у sharp под glibc стабильные prebuilt-бинарники.
Проверить, что нативный аддон sharp поднимается под Bun на этапе сборки образа; при проблемах
fallback — `@napi-rs/image` (Rust) или libvips-CLI.

---

## 7. API (ElysiaJS на Bun, порт 3001)

Caddy срезает префикс `/api` (`handle_path /api/*` в корневом `Caddyfile`), поэтому **роуты в
бэкенде объявляются от корня** (`/categories`, `/admin/...`, `/health`), а снаружи доступны как
`/api/...`.

### Публичные (read-only, без авторизации)

| Метод | Путь (внутр.)                       | Ответ                                                        |
| ----- | ----------------------------------- | ------------------------------------------------------------ |
| GET   | `/health`                           | `ok`                                                         |
| GET   | `/categories`                       | категории (+ контент секции, агрегаты, подкатегории/счётчики) |
| GET   | `/categories/:cat`                  | категория + её подкатегории + `description_long`             |
| GET   | `/categories/:cat/:sub`             | подкатегория + работы (тайлы: cover-thumb URL + `w/h`)       |
| GET   | `/tags`                             | теги-фильтры `/projects` со счётчиками видимых работ         |
| GET   | `/featured`                         | витрины секций по категориям (кураторские либо fallback)     |
| GET   | `/works`                            | работы: фильтры `category`/`subcategory`/`tag` + пагинация   |
| GET   | `/works/by-id/:id`                  | полная работа по id + слаги пути (`cat`/`sub`)               |
| GET   | `/works/:cat/:sub/:work`            | полная работа: описание + все картинки (варианты, `w/h`, alt)|

Форма тайла для листинга совместима с masonry-фронтом:
`{ id, slug, title, src, w, h, cat, sub, variants }` (`slug`/`title` = слаг работы для
канонического URL модалки и заголовок — подпись hero-тайла витрины, aria-label, списки админки;
`src` = URL `thumb` cover-картинки в jpg — fallback, `variants` = thumb в avif/webp/jpg для
`<picture>` в листинге, `w/h` = натуральные размеры → aspect-ratio без скачков,
`cat`/`sub` = слаги пути — тайл любого листинга сразу знает канонический URL
`/projects/:cat/:sub/:slug`, и фронт рендерит настоящую ссылку).

**Расширение под редизайн листинга** (задача 14; контракт — `projects-redesign.md` §5):

- **Счётчики честные**: `work_count` категории и подкатегории считают только ВИДИМЫЕ работы
  (у работы есть ≥1 картинка) — ровно те, что рендерятся тайлами. Работа без картинок не
  попадает ни в листинги, ни в счётчики, ни в `/tags`.
- `CategoryNav` дополнен контентом секции (`kicker`, `meta_role`, `period`,
  `display_variant`) и агрегатами (`work_count`, `updated_max` = max `work.updated_at`
  по видимым работам ISO-строкой `2026-07-28T01:15:09Z` либо `null` — в БД timestamp'ы лежат
  как `YYYY-MM-DD HH:MM:SS`, который парсится не всеми браузерами);
  `description_long` отдаётся только в `/categories/:cat`.
- `GET /tags` → `{ id, slug, title, sort_order, work_count }[]`, порядок `sort_order, id`;
  тег без работ отдаётся с `work_count: 0`.
- `GET /featured` → `{ cat, curated, works }[]` по всем категориям в порядке `sort_order`;
  `works` — работы с `work.featured_order` по возрастанию (`curated: true`), а если
  кураторская витрина пуста — первые 8 видимых работ категории (`curated: false`);
  элемент витрины = тайл + `description`.
- `GET /works` — **пагинация и фильтрация в SQL** (один JOIN с `LIMIT/OFFSET` + отдельный
  `COUNT(*)`, не обход дерева в памяти). Порядок: `category.sort_order → subcategory.sort_order
  → work.sort_order → work.id`. Параметры `category`, `subcategory` (требует `category`),
  `tag` комбинируются; неизвестный слаг фильтра → пустая страница `total: 0` (не 404).
  Лимит: дефолт **24** (порция инфинити-скролла), максимум 100.
- Детали работы (`/works/:cat/:sub/:work`, `/works/by-id/:id`) несут `tag_ids: number[]`
  (мультивыбор тегов в админке) и `seamless: boolean` (лента картинок без зазоров —
  0|1 в БД разворачивается в honest boolean, см. миграцию `0003`).

Агрегаты и листинги живут в `back/src/queries.ts` (слой SQL-чтений поверх CRUD-репозиториев);
сериализаторы форм — `back/src/dto.ts`, зеркала типов — `front/src/api/types.ts` и
`admin/src/api/types.ts` (менять синхронно все три).

### Админка (требуется авторизация)

| Метод            | Путь (внутр.)                          | Назначение                                  |
| ---------------- | -------------------------------------- | ------------------------------------------- |
| POST             | `/admin/login`                         | пароль → httpOnly-cookie с JWT              |
| POST             | `/admin/logout`                        | сбросить cookie                             |
| GET              | `/admin/me`                            | проверка сессии                             |
| POST/PATCH/DELETE| `/admin/categories[/:id]`              | CRUD категорий; PATCH принимает и контент секции: `kicker`, `meta_role`, `period`, `description_long` (string\|null) и `display_variant` (`showcase`\|`strip`\|`cards`, иначе 400) |
| PATCH            | `/admin/categories/:id/featured`       | `{work_ids:[…]}` — кураторская витрина секции: порядок массива = `featured_order` (0 = hero), работы категории вне списка → NULL, пустой массив очищает витрину. Чужая/несуществующая работа или дубликаты → 400 |
| POST/PATCH/DELETE| `/admin/subcategories[/:id]`           | CRUD подкатегорий                           |
| POST/PATCH/DELETE| `/admin/works[/:id]`                   | CRUD работ (title/description/cover/order); POST и PATCH принимают `seamless?: boolean` («единое полотно» — лента картинок без зазоров; не-boolean → 400, опущенный флаг на PATCH не сбрасывается); PATCH принимает `tag_ids?: number[]` — полная замена набора тегов (несуществующий id → 400, работа не изменена) |
| POST             | `/admin/works/:id/images`              | multipart-загрузка → пайплайн §6 → MinIO+БД |
| PATCH/DELETE     | `/admin/images/:id`                    | alt/порядок/удаление                        |
| POST/PATCH/DELETE| `/admin/tags[/:id]`                    | CRUD тегов-фильтров (`{title*, slug?, sort_order?}`); слаг уникален глобально, удаление каскадит `work_tag` |
| PATCH            | `/admin/.../reorder`                   | `sort_order` для категорий/подкат/работ/картинок/тегов |

GET-эндпоинтов у admin-API нет: админка читает публичные — список тегов `/tags`, витрины
`/featured`, работы категории `/works?category=`, теги работы — `tag_ids` в деталях работы.

**Авторизация (один редактор):**
- Пароль хранится как argon2id-хэш в env `ADMIN_PASSWORD_HASH` (`Bun.password.hash/verify` —
  встроено в Bun, без зависимостей).
- На логин — подписанный **JWT (HS256)** в **httpOnly + Secure + SameSite=Lax** cookie
  (`@elysiajs/jwt` + `@elysiajs/cookie`). Guard на префиксе `/admin/*` (кроме `/admin/login`).
- Мутации защищены от CSRF: SameSite-cookie + требование кастомного заголовка
  (`X-Requested-With`) или double-submit-токена. Rate-limit на `/admin/login`.

**Описание (`description`):** хранить как plain-text/markdown (рендер на фронте — лёгкий,
без тяжёлых редакторов). Уточнить формат при реализации админки; по умолчанию — markdown.

### Зависимости бэкенда (минимум)

`elysia`, `@elysiajs/jwt`, `@elysiajs/cookie`, `sharp`. S3 — `Bun.s3` (встроенный). SQLite —
`bun:sqlite` (встроенный). rclone — вендорится в образ как бинарь (см. §9), вызывается через
`Bun.spawn`. Никаких ORM (сырой `bun:sqlite` + тонкий слой репозиториев).

---

## 8. Интеграция с фронтом

- **API-клиент**: новый модуль `src/api/` (тонкие `fetch`-обёртки, типы ответов). База — `/api`.
- **Листинг**: заменить статические массивы `GROUPS`/тайлов в `ProjectsScreen.tsx` и
  `MobileProjects.tsx` на данные из API. Форма тайла `{ id, src, w, h, cat, sub, variants }` поддержана
  masonry (см. `front/CLAUDE.md`); тайл — `<Link>` на `/projects/:cat/:sub/:id`.
- **Модалка** (полноэкранная): новый компонент в **обоих** деревьях
  (`components/desktop/` + `components/mobile/`, по конвенции двойного дерева). Рендерит
  описание + карусель картинок (`<picture>` avif/webp/jpg, LQIP-фон на время загрузки).
  Роут `/projects/:cat/:sub/:work` (+ `?img=`). Открывается поверх листинга, по `Esc`/клику вне —
  `navigate` назад.
- **Роутинг** (`/front`): в `App.tsx` добавить `/projects/:cat/:sub/:work` (модалка поверх
  листинга). `/admin` — **не роут `/front`**, это отдельное приложение (см. ниже). Занавес-герой
  и выбор дерева не трогаем.
- **Vite dev-proxy** (`/front`): в `vite.config.ts` проксировать `/api` → `http://localhost:3001`
  и `/media` → MinIO, чтобы dev-фронт ходил на локальный бэкенд. Dev-сервер по-прежнему на 5005.

### Админка — отдельный проект `/admin` (свой контекст)

Публичный бандл `/front` должен оставаться стерильным (приоритет минимального бандла — см.
память проекта). Поэтому админка — **физически отдельный Vite+React проект** `/admin` с
полностью независимым контекстом сборки:

- Свой `package.json`, своё дерево зависимостей, свой билд → **ноль пересечения** с публичным
  сайтом. Admin-либы (формы, загрузчик, drag-n-drop сортировка) не влияют на вес сайта.
- `base: '/admin/'` в `vite.config.ts` → ассеты префиксуются `/admin/`.
- Один служебный layout (десктоп), без двойного дерева desktop/mobile — это back-office.
- Токены бренда — переиспользовать `tokens.css` опционально (для визуальной согласованности),
  но строгих рамок бренда здесь нет.
- Свой dev-proxy на `/api` → `localhost:3001`; dev-сервер на отдельном порту (напр. 5006).
  Chrome MCP завязан на 5005 — если для админки понадобится MCP-отладка, временно поднять её
  на 5005 вместо публичного фронта.

**Экраны админки** (роуты под `basename '/admin'`; в шапке — навигация «Категории» / «Теги»):

| Роут | Экран | Что внутри |
| --- | --- | --- |
| `/login` | Вход | пароль → JWT-cookie |
| `/` | Категории | CRUD + порядок; ✏️ открывает **форму раздела** (догружает `GET /categories/:cat` ради `description_long`): название/слаг/описание + контент секции — kicker, роль, период, длинное описание, вариант секции (`showcase`/`strip`/`cards`) |
| `/tags` | **Теги** | таблица (название, слаг, счётчик видимых работ из `GET /tags`), создание/переименование/удаление (с предупреждением о снятии со всех работ), порядок чипов — reorder |
| `/categories/:cat` | Подкатегории | CRUD + порядок, счётчик «работ с картинками», кнопка «Редактировать раздел» (та же форма категории) и блок **«Витрина раздела»** |
| `/categories/:cat/:sub` | Работы | CRUD + порядок; слаг/название берутся из тайла (`GET /categories/:cat/:sub`) |
| `/categories/:cat/:sub/:work` | Работа | описание (markdown), картинки (загрузка/порядок/alt/cover) и блок **«Теги»** — чипы-переключатели, сохранение через `tag_ids` в PATCH работы |

**Блок «Витрина раздела»** (страница категории): читает `GET /featured` (флаг `curated` отличает
настроенную витрину от fallback'а) и `GET /works?category=` (кандидаты — только видимые работы);
добавление/удаление/перестановка/«Очистить витрину» сохраняются одним
`PATCH /admin/categories/:id/featured {work_ids}`, первая позиция помечена **HERO**.
Контент листинга целиком редактируется отсюда (спека редизайна `docs/projects-redesign.md` §7).

**Хостинг — единый edge-Caddy с вшитой статикой (принятое решение):** `front/` и `admin/`
собираются **независимыми build-стадиями** одного multi-stage Dockerfile (контекст = корень
репо; у каждой стадии свой `bun install`/`build` и своё кэширование слоёв), их `dist`
**вшиваются** в финальный образ `caddy:2-alpine` как `/srv` и `/srv/admin`. Build-стадии
эфемерны — в рантайме контейнеров-сборщиков нет (экономия RAM). Один контейнер `caddy`
маршрутизирует всё:

```
/           → статика /srv (публичный фронт)      try_files → /index.html
/admin/*    → статика /srv/admin (админка)        try_files → /admin/index.html
/api/*      → reverse_proxy back:3001             (handle_path срезает /api)
/media/*    → reverse_proxy minio:9000            (public-read)
```

Так Caddy — единственный static-сервер и единая точка TLS/роутинга, а `back` остаётся чистым
JSON-API. Маршруты не конфликтуют (`/api/admin/*` — это admin-**эндпоинты API**, а `/admin/*` —
**статика** UI админки).

> Прежний сервис `front` (Caddy, привязанный к одному фронту) **заменяется** единым сервисом
> `caddy`. Dockerfile переезжает в корень репо; `front/` и `admin/` больше не self-serve и не
> имеют собственных рантайм-контейнеров.

---

## 9. Бэкап и restore (rclone)

**Почему rclone:** один бинарь покрывает и Yandex.Disk, и Dropbox, и Google Drive, и S3/MinIO
под единым интерфейсом — выбор облака сводится к строке конфига и меняется в любой момент.
Снимает развилку «где проще API». Рекомендация по облаку — **Yandex.Disk** (RU-проект,
стабилен с RU VPS, простой long-lived токен); Dropbox/GDrive — drop-in заменой remote.

**Где живёт логика:** модуль внутри бэкенда `back` (не отдельный контейнер — меньше движущихся
частей, нет межконтейнерной синхронизации). Бэкенд вызывает вендоренный в образ `rclone` через
`Bun.spawn`. Два remote в `rclone.conf`: `minio` (type s3, endpoint `http://minio:9000`) и
`cloud` (type yandex/dropbox/drive, токен).

### Push (по изменению, дебаунс ~10 мин)

Любая мутация в админке вызывает `markDirty()` → сбрасывает 10-минутный таймер (коалесинг).
По срабатыванию (`BACKUP_DEBOUNCE_MINUTES`, single-flight через мьютекс):

1. `VACUUM INTO '/data/backup-stage/db.sqlite'` — консистентный снимок БД (корректно с WAL).
2. **Сначала картинки**: `rclone sync minio:media cloud:proksion/media` (инкрементально).
3. **Потом БД**: `rclone copyto /data/backup-stage/db.sqlite cloud:proksion/db/db.sqlite`
   + версия в историю `cloud:proksion/db/history/db-<ts>.sqlite` (retention последних N).

Порядок **картинки → БД** гарантирует, что в облаке БД никогда не ссылается на ещё не
загруженные картинки (лишние «осиротевшие» картинки безвредны, обратное — нет).

### Restore (на старте, если данных нет)

Идемпотентно, только на «пустом» окружении (свежий VPS), не на каждом рестарте:

1. Дождаться готовности MinIO (`depends_on: condition: service_healthy`).
2. Если bucket `media` пуст → `rclone sync cloud:proksion/media minio:media`.
3. Если `/data/db.sqlite` отсутствует → `rclone copyto cloud:proksion/db/db.sqlite /data/db.sqlite`.
4. Открыть БД, прогнать миграции, начать обслуживание.

Порядок при restore — тоже **картинки → БД**. Если облако недоступно/пустое — стартуем с пустой
БД (новый проект), это норма.

> **Важно про volume:** named-volume Docker **переживает** рестарт и пересоздание контейнера
> (`docker compose down` без `-v`) — данные не обнуляются. Реальный риск — потеря/пересоздание
> самого VPS или `down -v`; именно от этого защищает off-site push в облако.

---

## 10. Безопасность

- HTTPS — Caddy (Let's Encrypt), уже настроено.
- MinIO-консоль и порт `back:3001` наружу не публикуются (только внутренняя сеть compose);
  снаружи — только `/api/*` и `/media/*` через Caddy.
- Креды MinIO, `JWT_SECRET`, `ADMIN_PASSWORD_HASH`, токен облака — только в env/секретах,
  не в репозитории. `.env` уже в `.gitignore`.
- `/media/*` — публичное чтение (портфолио и так публично); запись — только бэкенд по S3-кредам.
- Админка: httpOnly+Secure+SameSite cookie, rate-limit логина, CSRF-защита мутаций (§7).

---

## 11. Изменения в репозитории

```
/back                      ← НОВЫЙ: Bun + ElysiaJS
  ├── src/
  │   ├── index.ts          точка входа (Elysia), restore-on-boot
  │   ├── db/               bun:sqlite, миграции (.sql), репозитории
  │   ├── routes/           public/* + admin/*
  │   ├── storage/          Bun.s3 обёртка (MinIO), раскладка ключей
  │   ├── images/           пайплайн sharp (thumb/full, avif/webp/jpg, lqip)
  │   ├── auth/             Bun.password + JWT guard
  │   ├── backup/           debounce + rclone push/restore
  │   └── slug.ts           транслит ru→lat + уникальность
  ├── migrations/*.sql
  ├── Dockerfile            oven/bun:1 (glibc) + libvips + вендоренный rclone
  └── package.json

/front                     ← правки: src/api/, модалка (desktop+mobile),
                              роуты work-модалки, vite proxy (/api, /media).
                              Больше НЕ self-serve (свой Dockerfile/Caddyfile удаляются)

/admin                     ← НОВЫЙ: отдельный Vite+React проект (свой контекст/package.json/билд)
  ├── src/                  auth-форма логина, CRUD категорий/подкат/работ, загрузка картинок,
  │                         сортировка (sort_order), редактор описаний
  ├── vite.config.ts        base: '/admin/', dev-proxy /api → localhost:3001, dev-порт 5006
  └── package.json          свои зависимости — не влияют на бандл /front

/Dockerfile                ← НОВЫЙ (корень репо): multi-stage —
                              [build-front] + [build-admin] (независимые стадии) →
                              финальный caddy:2-alpine с /srv + /srv/admin
/Caddyfile                 ← НОВЫЙ (корень): / + /admin/* (static, свои SPA-fallback),
                              /api/* → back:3001 (handle_path), /media/* → minio:9000
/docker-compose.yml        ← сервис `front` заменяется на `caddy` (build: . , dockerfile:
                              Dockerfile); добавить back + minio; volumes, healthchecks
/.env.example              ← добавить переменные бэкенда/MinIO/бэкапа (см. ниже)
/Makefile                  ← dev-back, dev-admin; logs-front → logs-caddy
/docs/architecture.md      ← этот документ

# Удаляются: front/Dockerfile, front/Caddyfile (роль переезжает в корневые /Dockerfile,
# /Caddyfile). back/Dockerfile остаётся (отдельный рантайм-образ Bun-сервиса).
```

### Новые переменные окружения (`.env`)

```bash
# Backend
BACK_PORT=3001
DATABASE_PATH=/data/db.sqlite
JWT_SECRET=<random-32+>
ADMIN_PASSWORD_HASH=<argon2id из Bun.password.hash>

# MinIO
MINIO_ROOT_USER=<...>
MINIO_ROOT_PASSWORD=<...>
S3_ENDPOINT=http://minio:9000
S3_BUCKET=media
S3_ACCESS_KEY=<...>          # отдельный ключ приложения (или root для старта)
S3_SECRET_KEY=<...>

# Backup (rclone)
BACKUP_ENABLED=true
BACKUP_DEBOUNCE_MINUTES=10
BACKUP_REMOTE=cloud:proksion       # remote-путь в облаке
RCLONE_CONFIG=/config/rclone.conf  # монтируется как секрет/volume; токен облака — здесь
BACKUP_HISTORY_KEEP=14             # сколько версий БД хранить в history/
```

`rclone.conf` готовится один раз: `rclone config` (или `rclone authorize yandex`) локально →
получить токен → положить в секрет/volume `rclone_config`. Менять облако = поменять секцию
`[cloud]` (yandex → dropbox/drive), код не трогается.

---

## 12. План реализации (фазы под задачи агентов)

1. **Backend-скелет.** `/back`: Elysia, `bun:sqlite`, схема+миграции, `/health`, публичные
   read-эндпоинты, seed-данные. Проверка: запускается, отдаёт JSON.
2. **MinIO + загрузка/обработка.** Сервис `minio`, `Bun.s3`-обёртка, пайплайн sharp
   (варианты+форматы), отдача через Caddy `/media/*`, public-read политика.
3. **Админка (бэкенд + отдельное приложение `/admin`).** Auth (Bun.password+JWT), admin-CRUD
   эндпоинты; новый Vite-проект `/admin` (`base:'/admin/'`) с формами загрузки/описания/порядка;
   Caddy отдаёт его статику из `/srv/admin`.
4. **Интеграция фронта.** `src/api/`, замена заглушек листинга, модалка (desktop+mobile),
   роуты work-модалки + `?img=`, `<picture>` avif/webp/jpg, vite-proxy.
5. **Бэкап/restore.** Вендор rclone в образ, debounce-push, restore-on-boot, retention истории.
6. **Edge-Caddy + compose-обвязка и деплой.** Корневой multi-stage `Dockerfile`
   (build-front + build-admin → `caddy:2-alpine` с `/srv` + `/srv/admin`); сервис `front`
   заменяется на `caddy`; `back`+`minio` в compose, healthchecks, `depends_on`; корневой
   `Caddyfile` (`/`, `/admin/*`, `/api`, `/media`); `.env.example`, Makefile-цели, синк
   `CLAUDE.md` + памяти. Проверить: в рантайме только `caddy`+`back`+`minio`, билдеров нет.

Проверка корректности на каждом шаге — `npm run build` (фронт, strict) и запуск контейнеров
(`make up`), тестов/линтера в проекте нет.

---

## 13. Открытые вопросы и опции на будущее

- **Возможное упрощение (если приоритет минимализма пересилит):** MinIO можно заменить на
  обычную файловую систему на volume — Caddy отдаёт картинки как статику, rclone бэкапит папку
  (local-remote вместо s3-remote). Минус один контейнер. Сейчас по решению пользователя — MinIO;
  зафиксировано как осознанный выбор, опция оставлена на случай ревизии.
- **Формат `description`** — markdown vs plain: финализировать при реализации админки.
- **Пагинация `/works`** — размер страницы/курсор: определить по реальному объёму контента.
- **CDN перед `/media`** — пока не нужен (Caddy + кэш-заголовки + AVIF достаточно); задел есть.
```
