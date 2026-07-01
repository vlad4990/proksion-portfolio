# Вендорим rclone из официального образа (docs/architecture.md §9): rclone — статический Go-бинарь,
# переносим его в glibc-образ oven/bun:1 без пересборки. Пин по мажорной версии для воспроизводимости.
FROM rclone/rclone:1 AS rclone

# Базовый образ — oven/bun:1 (Debian/glibc, НЕ alpine/musl): под glibc у sharp стабильные
# prebuilt-бинарники (docs/architecture.md §6). sharp ≥0.33 ВЕНДОРИТ собственный libvips
# (пакеты @img/sharp-libvips-linux-*), поэтому ставить системный libvips через apt НЕ нужно —
# нативный аддон самодостаточен. Проверено в задаче 04: `sharp` грузится под Bun на этом образе
# (см. шаг verify ниже); fallback на @napi-rs/image НЕ потребовался.
FROM oven/bun:1

# CA-сертификаты: rclone (Go-бинарь) проверяет TLS облака бэкапа (Yandex/Dropbox/GDrive) по
# системному CA-бандлу, а базовый oven/bun:1 его не содержит. Без этого off-site push/lsd падает
# с `x509: certificate signed by unknown authority`. minio-remote идёт по HTTP и сертификатов не требует.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# rclone-бинарь для off-site бэкапа (задача 11). Токен облака сюда НЕ попадает — он в rclone.conf,
# который монтируется секретом/volume в рантайме (RCLONE_CONFIG). Дымовая проверка: бинарь запускается.
COPY --from=rclone /usr/local/bin/rclone /usr/local/bin/rclone
RUN rclone version

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
