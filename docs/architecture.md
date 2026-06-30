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

### Слаги

Генерируются на сервере из русского `title`: транслит ru→lat (своя маленькая таблица,
без зависимостей) → lowercase → пробелы в `-` → выкинуть всё кроме `[a-z0-9-]` →
гарантировать уникальность в нужной области суффиксом `-2`, `-3`. Редактируемы в админке.
**Слаг стабилен после создания** (смена `title` его не меняет автоматически), чтобы не ломать
расшаренные ссылки. Хранится в БД.

---

## 4. URL-схема (фронт + API)

Совместима с уже существующими роутами фронта (`/projects/:cat/:sub`).

| URL                                         | Что                                                |
| ------------------------------------------- | -------------------------------------------------- |
| `/projects`                                 | листинг всех работ                                 |
| `/projects/:cat/:sub`                       | листинг работ подкатегории                         |
| `/projects/:cat/:sub/:work`                 | **модалка** работы (поверх листинга)               |
| `/projects/:cat/:sub/:work?img=<imageId>`   | модалка с открытым конкретным слайдом карусели     |
| `/admin`, `/admin/*`                        | **отдельное приложение** (свой бандл, не во `/front`) |

Модалка — это роут поверх листинга: при прямом заходе рендерится листинг + открытая модалка,
при закрытии — `navigate` назад на `/projects/:cat/:sub`. Конкретная картинка карусели
пиннится query-параметром `?img=` (канонический путь работы не плодит дублей).

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
| GET   | `/categories`                       | категории (+ подкатегории/счётчики) для навигации            |
| GET   | `/categories/:cat`                  | категория + её подкатегории                                  |
| GET   | `/categories/:cat/:sub`             | подкатегория + работы (тайлы: cover-thumb URL + `w/h`)       |
| GET   | `/works`                            | все работы (для `/projects`), пагинация                      |
| GET   | `/works/:cat/:sub/:work`            | полная работа: описание + все картинки (варианты, `w/h`, alt)|

Форма тайла для листинга совместима с masonry-фронтом: `{ id, src, w, h }`
(`src` = URL `thumb` cover-картинки, `w/h` = натуральные размеры → aspect-ratio без скачков).

### Админка (требуется авторизация)

| Метод            | Путь (внутр.)                          | Назначение                                  |
| ---------------- | -------------------------------------- | ------------------------------------------- |
| POST             | `/admin/login`                         | пароль → httpOnly-cookie с JWT              |
| POST             | `/admin/logout`                        | сбросить cookie                             |
| GET              | `/admin/me`                            | проверка сессии                             |
| POST/PATCH/DELETE| `/admin/categories[/:id]`              | CRUD категорий                              |
| POST/PATCH/DELETE| `/admin/subcategories[/:id]`           | CRUD подкатегорий                           |
| POST/PATCH/DELETE| `/admin/works[/:id]`                   | CRUD работ (title/description/cover/order)  |
| POST             | `/admin/works/:id/images`              | multipart-загрузка → пайплайн §6 → MinIO+БД |
| PATCH/DELETE     | `/admin/images/:id`                    | alt/порядок/удаление                        |
| PATCH            | `/admin/.../reorder`                   | `sort_order` для категорий/подкат/работ/картинок |

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
  `MobileProjects.tsx` на данные из API. Форма тайла `{ id, src, w, h }` уже поддержана masonry
  (см. `front/CLAUDE.md`) — менять раскладку не нужно.
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
