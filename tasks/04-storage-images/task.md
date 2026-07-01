# Task — 04 storage-images

**Слой:** `/back`. **Методология:** **TDD** (`bun test`; пайплайн — unit, S3 — интеграция со
запущенным `minio`). Спека: §5, §6.

## Цель
Готовые протестированные модули: S3-клиент к MinIO, bootstrap bucket'а с public-read, пайплайн
sharp (варианты+форматы+lqip) и оркестратор `store`, кладущий варианты по раскладке ключей.

## Структура
```
back/src/
├── storage/
│   ├── s3.ts            Bun.s3-клиент (endpoint/bucket/keys из env): put/exists/list(count)/delete
│   └── bootstrap.ts     ensureBucket() + putBucketPolicy(public-read на images/*); вызов на boot
└── images/
    ├── pipeline.ts      sharp: buffer → { w, h, variants: {thumb,full}×{avif,webp,jpg}, lqip }
    └── store.ts         orchestrate: pipeline → s3.put по key_base → метаданные для БД
```

## Шаги (TDD)

1. **pipeline.ts** (тесты first). На вход буфер картинки → на выход натуральные `w/h`,
   набор байтов для `thumb` (≈800px по бóльшей стороне) и `full` (≈2000px) в `avif`/`webp`/`jpg`,
   и `lqip` (крошечный ~16–24px blur → base64). Тесты с фикстурой: размеры вписаны, форматы
   корректны (по сигнатуре байтов), `lqip` непустой и короткий.
2. **s3.ts** (интеграционные тесты против `minio`). `put(key, bytes, contentType)`,
   `exists(key)`, `count(prefix)`, `delete(key|prefix)`. Тест: round-trip put→exists→(публичный
   GET через endpoint)→delete. Гейт по доступности MinIO.
3. **bootstrap.ts** — `ensureBucket()` создаёт `media` если нет; ставит public-read на `images/*`.
   Тест: после bootstrap анонимный GET положенного объекта = 200; объект вне `images/` —
   не публичен (или по политике проекта). Вызвать bootstrap при старте приложения.
4. **store.ts** — `storeImage(workId, imageId, inputBuffer)`: прогнать pipeline, залить все
   варианты под `images/{workId}/{imageId}/...`, вернуть `{ key_base, width, height, lqip }`
   (готово для записи в `image` репозиторием в задаче 06). Тест (интеграция): после вызова все
   ожидаемые ключи существуют в MinIO; возврат корректен.
5. **Dockerfile `back`** — добавить зависимости для sharp (libvips) на `oven/bun:1`.
   Проверить, что `sharp` грузится под Bun; при провале — переключиться на `@napi-rs/image`
   и отразить в коде/комментарии. Зафиксировать решение.

## Требования
- Strict TS, без `any`. Порядок вариантов/форматов и размеры — через конфиг (одно место).
- Чистая граница: `pipeline` не знает про S3; `store` склеивает.
- Порядок «картинки иммутабельны» — перезаливка работает идемпотентно (тот же key_base).

## Deliverables
`storage/{s3,bootstrap}.ts`, `images/{pipeline,store}.ts`, обновлённый `back/Dockerfile`,
тесты. `bun test` зелёный (с поднятым `minio` для интеграционных).
</content>
