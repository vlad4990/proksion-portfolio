# Базовый образ — oven/bun:1 (Debian/glibc, НЕ alpine): задел под нативный sharp (§6).
FROM oven/bun:1

WORKDIR /app

# Сначала манифесты — слой зависимостей кэшируется, пока package.json/lock не менялись.
COPY package.json bun.lock* ./
RUN bun install

COPY . .

ENV BACK_PORT=3001
EXPOSE 3001

CMD ["bun", "run", "src/index.ts"]
