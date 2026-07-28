# Verify — 14 public-api-listing

## Команды

```bash
cd back  && bun test && bun run typecheck
cd front && npm run build      # типы-зеркала не сломали strict-сборку
cd admin && npm run build
```

## Контракт (покрыто тестами — проверить наличие и прохождение)

- [ ] Форма тайла строго `['cat','h','id','slug','src','sub','title','variants','w']`
      (оба key-теста обновлены).
- [ ] `GET /categories`: у категории есть `kicker/meta_role/period/display_variant/
      work_count/updated_max`; `work_count` категории = сумма видимых работ;
      подкатегория с работой без картинок не учитывается в счётчиках.
- [ ] `GET /categories/:cat` дополнительно содержит `description_long`.
- [ ] `GET /tags`: сортировка по `sort_order, id`; счётчики только по видимым
      работам; тег без работ → `work_count: 0`.
- [ ] `GET /featured`: категории в порядке `sort_order`; кураторский порядок
      соблюдён (0 = первый элемент, `curated: true`); у категории без витрины —
      fallback первые 8 видимых работ и `curated: false`; без работ —
      `works: []`; у `FeaturedWork` есть `description`.
- [ ] `GET /works`: комбинации фильтров дают правильные `items`/`total`;
      неизвестный слаг → `{items:[], total:0}`, статус 200; дефолтный limit 24,
      max 100 клампится; offset за концом → пустые items, корректный total;
      порядок глобального листинга не изменился относительно старой реализации
      (category → subcategory → work по sort_order).
- [ ] `WorkDetail`/`WorkDetailById` содержат `tag_ids` (отсортированы или
      стабильный порядок).
- [ ] `lqip` по-прежнему опускается, когда null.

## Ручная проверка (живой стек)

```bash
make dev-back   # bun watch на 3001 (+ MinIO не обязателен для JSON-проверок)
curl -s localhost:3001/tags | jq
curl -s localhost:3001/featured | jq '.[0]'
curl -s 'localhost:3001/works?category=kupikod&tag=<slug>&limit=5' | jq '{total, n: (.items|length)}'
```

- [ ] На данных сида ответы соответствуют спеке §5 визуально (поля/порядок/счётчики).

## Done

Все пункты + `docs/architecture.md` §7 обновлён (новые строки таблицы эндпоинтов,
пометка про SQL-пагинацию `/works`).
