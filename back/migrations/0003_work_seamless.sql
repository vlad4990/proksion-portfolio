-- 0003_work_seamless — флаг «единое полотно» для ленты картинок работы.
-- Лента в модалке работы обычно идёт с зазором (--tile-gap); если картинки — нарезка
-- одного макета, зазор ломает картинку, поэтому работа может попросить стык-в-стык.
-- SQLite без BOOLEAN: 0/1 + CHECK. Только ADD COLUMN — down-миграций нет.

ALTER TABLE work ADD COLUMN seamless INTEGER NOT NULL DEFAULT 0
  CHECK (seamless IN (0, 1));
