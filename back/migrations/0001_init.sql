-- 0001_init — схема PROKSION (docs/architecture.md §3).
-- FK с ON DELETE CASCADE по дереву, work.cover_image_id — ON DELETE SET NULL.
-- Уникальность слагов: category.slug глобально; subcategory(category_id, slug);
-- work(subcategory_id, slug).

-- Категория = «проект»
CREATE TABLE category (
  id          INTEGER PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Подкатегория = «баннеры», «обложки» и т.п.
CREATE TABLE subcategory (
  id          INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES category(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
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
  slug           TEXT NOT NULL,
  title          TEXT,
  description    TEXT,
  cover_image_id INTEGER REFERENCES image(id) ON DELETE SET NULL,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (subcategory_id, slug)
);

-- Картинка работы (1..N; первая/выбранная — cover)
CREATE TABLE image (
  id         INTEGER PRIMARY KEY,
  work_id    INTEGER NOT NULL REFERENCES work(id) ON DELETE CASCADE,
  key_base   TEXT NOT NULL,
  width      INTEGER NOT NULL,
  height     INTEGER NOT NULL,
  alt        TEXT,
  lqip       TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Индексы по FK-колонкам (ускоряют каскады и листинг по родителю)
CREATE INDEX idx_subcategory_category ON subcategory(category_id);
CREATE INDEX idx_work_subcategory ON work(subcategory_id);
CREATE INDEX idx_image_work ON image(work_id);
