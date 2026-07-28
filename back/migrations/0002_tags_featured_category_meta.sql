-- 0002_tags_featured_category_meta — данные редизайна листинга проектов
-- (docs/projects-redesign.md §4): контентные поля секции категории, кураторская витрина
-- и глобальные теги-фильтры. Только ADD COLUMN / CREATE TABLE — down-миграций нет.

-- Категория: контент секции на /projects и страницы категории
ALTER TABLE category ADD COLUMN kicker           TEXT;  -- «КОММЕРЧЕСКАЯ ГРАФИКА» (оверлайн без номера)
ALTER TABLE category ADD COLUMN meta_role        TEXT;  -- «SMM · ПРОМО-ГРАФИКА»
ALTER TABLE category ADD COLUMN period           TEXT;  -- «2023 — 2026»
ALTER TABLE category ADD COLUMN description_long TEXT;  -- полный текст для страницы категории
ALTER TABLE category ADD COLUMN display_variant  TEXT NOT NULL DEFAULT 'showcase'
  CHECK (display_variant IN ('showcase','strip','cards'));  -- вариант секции-витрины

-- Витрина: NULL = не в витрине; иначе порядок в витрине категории, 0 = hero-слот.
-- Уникальность в пределах категории обеспечивается кодом (setFeatured переписывает
-- весь список одной транзакцией), а не констрейнтом — категория работы известна
-- только через её подкатегорию.
ALTER TABLE work ADD COLUMN featured_order INTEGER;

-- Глобальные теги (чипы-фильтры корневой /projects), m2m с работами
CREATE TABLE tag (
  id         INTEGER PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,          -- транслит, для /projects?tag=<slug>
  title      TEXT NOT NULL,                 -- русский заголовок (uppercase в UI)
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE work_tag (
  work_id INTEGER NOT NULL REFERENCES work(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tag(id)  ON DELETE CASCADE,
  PRIMARY KEY (work_id, tag_id)
);

-- PK work_tag покрывает выборку по работе; отдельный индекс — для выборки по тегу
CREATE INDEX idx_work_tag_tag   ON work_tag(tag_id);
-- Частичный индекс: строк с витриной единицы, обычные работы в индекс не попадают
CREATE INDEX idx_work_featured  ON work(featured_order) WHERE featured_order IS NOT NULL;
