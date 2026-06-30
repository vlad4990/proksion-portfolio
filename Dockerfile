# ──────────────────────────────────────────────────────────────────────────────
# Корневой multi-stage Dockerfile (контекст = корень репо).
# Две независимые build-стадии собирают статику публичного фронта и админки,
# их dist вшиваются в финальный образ caddy:2-alpine как /srv и /srv/admin.
# Build-стадии эфемерны — в рантайме контейнеров-сборщиков нет (docs/architecture.md §2, §8).
# ──────────────────────────────────────────────────────────────────────────────

# ── Стадия build-front: публичный портфолио-SPA (/front → /srv) ──
FROM oven/bun:1-alpine AS build-front
WORKDIR /app/front
# Сначала манифесты — слой зависимостей кэшируется, пока package.json/lock не менялись.
COPY front/package.json front/package-lock.json ./
RUN bun install
COPY front/ ./
RUN bun run build        # tsc --noEmit (strict) + vite build → /app/front/dist

# ── Стадия build-admin: админка (/admin → /srv/admin), base: '/admin/' ──
FROM oven/bun:1-alpine AS build-admin
WORKDIR /app/admin
COPY admin/package.json admin/package-lock.json ./
RUN bun install
COPY admin/ ./
RUN bun run build        # tsc --noEmit (strict) + vite build → /app/admin/dist

# ── Runtime: Caddy с вшитой статикой (единственная точка TLS/роутинга) ──
FROM caddy:2-alpine AS runtime
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build-front /app/front/dist /srv
COPY --from=build-admin /app/admin/dist /srv/admin
EXPOSE 80 443
