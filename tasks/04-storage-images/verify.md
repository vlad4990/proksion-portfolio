# Verify — 04 storage-images

## Тесты (TDD)
- [ ] `cd back && bun test` — зелёный. Pipeline покрыт unit-тестами; S3/store — интеграционными
      (с поднятым `minio`); при отсутствии MinIO интеграционные помечаются skipped, не падают.

## Пайплайн (sharp)
- [ ] Из фикстуры извлекаются корректные натуральные `w/h`.
- [ ] Генерируются `thumb` (≈800px) и `full` (≈2000px), каждый в `avif`, `webp`, `jpg`
      (формат подтверждается сигнатурой байтов).
- [ ] `lqip` — непустая короткая base64-строка.
- [ ] `sharp` поднимается в образе `back` (`oven/bun:1`); если использован fallback
      `@napi-rs/image` — это зафиксировано в коде/комментарии.

## S3 / bootstrap (MinIO)
- [ ] `ensureBucket()` создаёт `media`, повторный вызов идемпотентен.
- [ ] После `store` все ожидаемые ключи (`images/{workId}/{imageId}/{thumb,full}.{avif,webp,jpg}`)
      существуют.
- [ ] Анонимный GET `http://minio:9000/media/images/.../thumb.webp` → 200 (public-read работает);
      снаружи тот же объект доступен как `/media/images/.../thumb.webp` через Caddy.
- [ ] `delete(prefix)` удаляет все варианты картинки.

## Сборка образа
- [ ] `docker compose build back` проходит (libvips/sharp ставятся).

## TS
- [ ] `tsc --noEmit` strict — без ошибок, без `any`.

## Done
Примитивы хранилища/обработки готовы и протестированы; HTTP-аплоада и записи в БД нет (задача 06).
</content>
