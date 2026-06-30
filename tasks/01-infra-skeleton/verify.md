# Verify — 01 infra-skeleton

## Сборка
- [ ] `docker compose build` проходит без ошибок (multi-stage собирает front и admin).
- [ ] `cd front && npm run build` — зелёный (tsc strict). `cd admin && npm run build` — зелёный.

## Рантайм (`make up`)
- [ ] `docker compose ps` показывает **ровно три** запущенных сервиса: `caddy`, `back`, `minio`.
- [ ] **Нет** контейнеров-сборщиков (build-front / build-admin) среди running — это стадии, не сервисы.
- [ ] Все три — `healthy` (healthcheck'и проходят).

## Маршрутизация (локально, `SITE_ADDRESS=:80`)
- [ ] `curl -s localhost/api/health` → `ok` (Caddy срезал `/api`, проксировал на `back:3001`).
- [ ] `curl -sI localhost/` → 200, отдаётся публичный фронт (`index.html`).
- [ ] `curl -sI localhost/admin/` → 200, отдаётся placeholder админки (`/srv/admin/index.html`).
- [ ] Deep-link фронта (напр. `localhost/projects/x/y`) → 200 (SPA-fallback на `/index.html`).
- [ ] Deep-link админки (напр. `localhost/admin/anything`) → 200 (fallback на `/admin/index.html`).

## Изоляция / безопасность
- [ ] Порты `back` и `minio` наружу НЕ опубликованы (`docker compose ps` — только `caddy` мапит порты).
- [ ] `back` и `minio` доступны изнутри сети compose по именам (`back:3001`, `minio:9000`).

## Чистота
- [ ] `front/Dockerfile` и `front/Caddyfile` удалены; корневые `/Dockerfile` и `/Caddyfile` на месте.
- [ ] `.env.example` содержит новые переменные (`BACK_PORT`, `MINIO_*`, `S3_*`).
- [ ] `make down` останавливает всё; повторный `make up` поднимает заново (volumes переживают).

## Done
Все пункты отмечены; `back`-логики/реальной админки нет (это следующие задачи) — и не должно быть.
</content>
