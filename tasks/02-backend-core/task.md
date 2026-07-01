# Task — 02 backend-core

**Слой:** `/back`. **Методология:** **TDD** (`bun test`, тест-ферст). Спека: §3, §7, §11.

## Цель
Готовый, протестированный слой данных: открытие БД с правильными PRAGMA, идемпотентный раннер
миграций, схема §3, типизированные репозитории CRUD, slug-утилита. Поверх — тонкий каркас
приложения (конфиг). Всё покрыто `bun test`.

## Структура
```
back/
├── src/
│   ├── config.ts            типизированное чтение env (DATABASE_PATH, BACK_PORT, ...)
│   ├── db/
│   │   ├── index.ts         open(bun:sqlite) + PRAGMA WAL/FK + прогон миграций
│   │   ├── migrate.ts       раннер: читает migrations/*.sql по порядку, трекает применённые
│   │   └── repositories/    category.ts, subcategory.ts, work.ts, image.ts (тонкие функции)
│   ├── slug.ts              транслит ru→lat + slugify + уникальность в области
│   └── types.ts             доменные типы (Category, Subcategory, Work, Image)
├── migrations/
│   └── 0001_init.sql        DDL из §3
└── src/**/*.test.ts         тесты (рядом с кодом)
```

## Шаги (TDD — тесты пишутся первыми)

1. **config.ts** — тип `Config` + загрузка из env с дефолтами. Тест: дефолты, переопределение.
2. **slug.ts** — `transliterate(ru)`, `slugify(title)`, `uniqueSlug(base, existing[])`.
   Тесты first: «Брендинг»→`brending`, пробелы/регистр/мусор, коллизии→`-2/-3`,
   пустой/только-кириллица-без-карты → корректный fallback.
3. **migrate.ts** — раннер `.sql`-файлов по возрастанию имени, фиксация применённых
   (таблица `_migrations` или `user_version`). Тесты: применяет с нуля; повторный прогон
   ничего не делает (идемпотентность); порядок соблюдён.
4. **0001_init.sql** — DDL четырёх таблиц по §3 (FK, CASCADE/SET NULL, UNIQUE-области, дефолты
   `created_at/updated_at`). Тест: после миграции таблицы и индексы существуют; вставка с
   нарушением UNIQUE/FK падает; `ON DELETE CASCADE` каскадит, `cover_image_id` → SET NULL.
5. **repositories/** — для каждой сущности `create/getById/getBySlug/list/update/delete`
   на подготовленных запросах, типизированный возврат. Тесты first: CRUD, выборка по слагу,
   listing с сортировкой по `sort_order`, каскады при удалении родителя.
6. **db/index.ts** — `openDb(path)`: открыть, выставить PRAGMA, прогнать миграции. Тест:
   на temp-файле PRAGMA выставлены (`journal_mode=wal`, `foreign_keys=on`).

## Требования
- Strict TS, без `any`. Циклическая ссылка `work.cover_image_id ↔ image` — создавать работу
  без cover, проставлять после (репозиторий должен это поддерживать).
- Тесты используют `:memory:`/temp-файл; не трогают `/data/db.sqlite`.
- `package.json`: скрипт `test` → `bun test`.

## Deliverables
Слой `back/src/{config,slug,types,db/*}` + `migrations/0001_init.sql` + полный набор
проходящих тестов. `bun test` зелёный.
</content>
