# Базовый образ — oven/bun:1 (Debian/glibc, НЕ alpine/musl): под glibc у sharp стабильные
# prebuilt-бинарники (docs/architecture.md §6). sharp ≥0.33 ВЕНДОРИТ собственный libvips
# (пакеты @img/sharp-libvips-linux-*), поэтому ставить системный libvips через apt НЕ нужно —
# нативный аддон самодостаточен. Проверено в задаче 04: `sharp` грузится под Bun на этом образе
# (см. шаг verify ниже); fallback на @napi-rs/image НЕ потребовался.
FROM oven/bun:1

WORKDIR /app

# Сначала манифесты — слой зависимостей кэшируется, пока package.json/lock не менялись.
# bun install (без --frozen) до-резолвит платформенные optional-deps sharp под linux-аркой образа.
COPY package.json bun.lock* ./
RUN bun install

# Дымовая проверка на этапе сборки: нативный sharp реально загружается под Bun в этом образе.
# Если бинарник несовместим — образ упадёт здесь, а не молча в рантайме.
RUN bun -e "import sharp from 'sharp'; const b = await sharp({create:{width:8,height:8,channels:3,background:{r:1,g:2,b:3}}}).webp().toBuffer(); if (b.length === 0) throw new Error('sharp produced empty output'); console.log('[build] sharp ok:', sharp.versions.sharp, 'libvips', sharp.versions.vips)"

COPY . .

ENV BACK_PORT=3001
EXPOSE 3001

CMD ["bun", "run", "src/index.ts"]
