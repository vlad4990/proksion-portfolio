# Verify — 13 db-tags-featured

## Команды

```bash
cd back && bun test            # все тесты зелёные (старые + новые)
cd back && bun run typecheck   # tsc --noEmit, strict
```

## Миграция на копии прод-дампа

```bash
cp prod-dump/db.sqlite /tmp/proksion-migrate-test.sqlite
# накатить миграции на копию (bun-скриптом через openDb или sqlite3 < 0002_*.sql)
sqlite3 /tmp/proksion-migrate-test.sqlite "PRAGMA integrity_check;"
sqlite3 /tmp/proksion-migrate-test.sqlite \
  "SELECT display_variant, COUNT(*) FROM category GROUP BY 1;"   # все 'showcase'
sqlite3 /tmp/proksion-migrate-test.sqlite \
  "SELECT COUNT(*) FROM tag; SELECT COUNT(*) FROM work_tag;"     # 0 и 0, без ошибок
```

- [ ] Миграция применяется к копии прод-дампа без ошибок; существующие данные целы
      (`SELECT COUNT(*) FROM work` — как до миграции, 34).
- [ ] `_migrations` содержит `0001_…` и `0002_…`.

## Чек-лист поведения (покрыто тестами)

- [ ] `display_variant` по умолчанию `'showcase'`; значение вне
      `('showcase','strip','cards')` отвергается CHECK'ом.
- [ ] Каскады: удаление работы чистит её строки в `work_tag`; удаление тега — свои.
- [ ] `tag.getBySlug` / уникальность `tag.slug` (повторный create с тем же слагом падает).
- [ ] `setWorkTags` заменяет набор целиком (в т.ч. пустой массив = снять все теги).
- [ ] `setFeatured(categoryId, [w3, w1])` → у w3 `featured_order=0`, у w1 — 1, у прочих
      работ категории — NULL; работы других категорий не задеты.
- [ ] `listFeatured` возвращает в порядке `featured_order`.
- [ ] `runUpdate` категории принимает новые поля; `featured_order` через частичный
      UPDATE работы не меняется.
- [ ] `seed(db)` идемпотентен (двойной вызов не падает и не дублирует) и содержит
      теги/разметку/витрину/заполненные меты — данные для контрактных тестов 14–15.

## Done

Все пункты выше + `docs/architecture.md` §3 упоминает новые таблицы/поля.
