# Context — 04 storage-images

## Цель в одной строке
Примитивы хранилища и обработки картинок: клиент MinIO (`Bun.s3`), bootstrap bucket'а с
public-read, пайплайн `sharp` (thumb/full × avif/webp/jpg + lqip) — как протестированные модули.

## Опорные разделы спеки
- §5 (MinIO, раскладка ключей, `Bun.s3`, public-read), §6 (пайплайн sharp, образ `oven/bun:1`
  glibc, fallback `@napi-rs/image`).

## Что уже есть
- Сервис `minio` (задача 01), доступен по `minio:9000` в сети compose. Env `S3_*`.
- Слой данных и репозитории (задача 02).

## Методология — TDD
- **Пайплайн** тестируется first против фикстуры-картинки: проверка натуральных `w/h`,
  что сгенерированы оба размера и все три формата, что `lqip` — короткая base64-строка.
- **S3-клиент** — интеграционные тесты против запущенного `minio` (put→exists→get round-trip).
  Тесты гейтятся переменной (если MinIO недоступен — помечать skipped, не падать); локально
  гонять с поднятым `minio`.

## Раскладка ключей (§5)
```
images/{workId}/{imageId}/thumb.avif|webp|jpg     (~800px)
images/{workId}/{imageId}/full.avif|webp|jpg      (~2000px)
images/{workId}/{imageId}/orig.{ext}              (опционально)
```
`key_base = images/{workId}/{imageId}`. Bucket `media`, public-read на `images/*`.

## Инварианты / ограничения
- Это **примитивы**: модули `s3` + `pipeline` + `store` + `bootstrap`. Связку с БД и
  HTTP-аплоадом делает admin-api (задача 06) — здесь её НЕТ.
- S3 — через встроенный `Bun.s3` (endpoint MinIO), без AWS SDK. Если `Bun.s3` упрётся в
  совместимость — задокументировать и поставить `@aws-sdk/client-s3` как fallback.
- В Dockerfile `back` добавить рантайм-зависимости sharp/libvips; **проверить**, что sharp
  поднимается под Bun на `oven/bun:1` (glibc). Fallback — `@napi-rs/image`.
- Отдача картинок наружу — уже маршрутизирована Caddy (`/media/*` → `minio`, задача 01);
  бэкенд байты не проксирует.

## На что НЕ замахиваться
HTTP-эндпоинт загрузки, запись в БД image-строк, auth — это задача 06.
</content>
