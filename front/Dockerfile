# ──────────────────────────────────────────────────────────────────────────────
# Build: собираем статику Vite-SPA на Bun
# ──────────────────────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS build
WORKDIR /app

# Сначала только манифесты — слой с зависимостями кэшируется,
# пока package.json/lock не менялись. Bun сам мигрирует npm-lock в свой формат.
COPY package.json package-lock.json ./
RUN bun install

COPY . .
RUN bun run build        # tsc --noEmit (strict) + vite build → /app/dist

# ──────────────────────────────────────────────────────────────────────────────
# Runtime: отдаём dist через Caddy (авто-HTTPS Let's Encrypt + SPA-fallback)
# ──────────────────────────────────────────────────────────────────────────────
FROM caddy:2-alpine AS runtime

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv

EXPOSE 80 443
