# PROKSION — прод-деплой (VPS)

Одноразовая настройка и запуск функциональной части на сервере. Стек — три рантайм-контейнера
(`caddy` + `back` + `minio`), поднимается одним `docker compose`. Архитектура и решения —
[`architecture.md`](architecture.md); нарезка задач — [`../tasks/`](../tasks). Этот файл — практический
чек-лист «от чистого VPS до работающего сайта».

## 1. Что это за стек

```
Internet :443 ─▶ caddy (edge, TLS Let's Encrypt)
                 ├─ /            → статика публичного фронта (/srv)      вшита в образ
                 ├─ /admin/*     → статика админки (/srv/admin)          вшита в образ
                 ├─ /api/*       → reverse_proxy back:3001               (handle_path срезает /api)
                 └─ /media/*     → reverse_proxy minio:9000              (public-read картинки)
                        │                    │
                   back (Bun/Elysia)     minio (S3-хранилище)
                   • bun:sqlite          • bucket media, images/*
                   • sharp (thumb/full)  • наружу НЕ публикуется
                   • rclone (backup)
```

**Рантайм — ровно три сервиса** (`caddy`, `back`, `minio`). `minio-init` — одноразовый job
(заводит app-ключ MinIO и бакет, затем завершается; в `docker compose ps` без `-a` не виден).
Билд-стадии front/admin эфемерны — контейнеров-сборщиков в рантайме нет.

## 2. Требования к серверу

- Linux VPS с Docker + Docker Compose v2.
- Домен (`proksion.ru`) с A-записью на IP сервера.
- Порты **80 и 443** открыты в фаерволе (Caddy сам выпускает и продлевает HTTPS Let's Encrypt;
  challenge идёт по 80/443, поэтому оба обязательны).
- Исходящий HTTPS к облаку бэкапа (Яндекс.Диск/Dropbox/GDrive) — если включаешь off-site бэкап.

## 3. Первый запуск

```bash
git clone <repo> && cd portfolio
cp .env.example .env         # затем ОТРЕДАКТИРУЙ .env (см. §4) — без этого поднимать нельзя
make up                      # docker compose up -d --build → сборка образов + запуск
```

Проверка:

```bash
docker compose ps            # caddy, back, minio — все healthy (minio-init уже завершился)
make logs-caddy              # видно выпуск сертификата Let's Encrypt
curl -fsS https://proksion.ru/api/health   # → ok
```

Первый выпуск TLS занимает несколько секунд после старта. Сертификаты кладутся в volume
`caddy_data` и переживают пересоздание контейнера — повторные рестарты не долбятся в Let's Encrypt
(у него есть rate-limit).

## 4. Переменные окружения (`.env`)

Все секреты — только в `.env` (в `.gitignore`, в образ не попадают) и в volume `rclone_config`
(токен облака). Полный список с комментариями — в [`.env.example`](../.env.example). Что **обязательно**
поменять перед проком:

| Переменная            | Как получить / чему равно                                                        |
| --------------------- | -------------------------------------------------------------------------------- |
| `SITE_ADDRESS`        | Домен, напр. `proksion.ru` (→ авто-HTTPS). Для локали — `:80` (HTTP).             |
| `JWT_SECRET`          | Случайная строка 32+: `openssl rand -base64 48`.                                 |
| `ADMIN_PASSWORD_HASH` | argon2id-хэш пароля: `cd back && bun run hash '<пароль>'`. **Удвой каждый `$` до `$$`** при вставке в `.env` (compose интерполирует `$`), иначе хэш обрежется и логин не пройдёт. |
| `MINIO_ROOT_USER/PASSWORD` | Свои значения. Root MinIO — только для провижининга (minio-init), back под ним не ходит. |
| `S3_ACCESS_KEY/SECRET_KEY` | **Отдельный** app-ключ бэкенда (НЕ равен root). minio-init заведёт под него пользователя MinIO, ограниченного бакетом `media`. |
| `COOKIE_SECURE`       | `true` на проде (HTTPS). `false` — только для локального прогона по HTTP.         |

`HTTP_PORT`/`HTTPS_PORT` (80/443) можно переопределить для нестандартного окружения (напр. если
80/443 заняты — поднять на 8080/8443, тогда TLS не выпустится и нужен `SITE_ADDRESS=:80`).

## 5. Off-site бэкап (rclone) — одноразовая настройка

Бэкап БД+картинок в облако по изменению (дебаунс `BACKUP_DEBOUNCE_MINUTES`, порядок картинки→БД) и
restore на старте при пустом окружении (§9 спеки). Модуль живёт внутри `back`, вызывает
вендоренный в образ `rclone`. Токен облака — в `rclone.conf`, монтируется в `back` как `/config`
(read-only), в репозиторий/образ **не попадает**.

1. **Получить токен облака** (пример Яндекс.Диск) на машине с браузером:
   ```bash
   rclone authorize yandex        # откроет браузер, вернёт JSON-токен в консоль
   ```
   (Dropbox → `rclone authorize dropbox`, Google Drive → `rclone authorize drive`.)

2. **Собрать `rclone.conf`** — два remote: `minio` (наш S3) и `cloud` (облако):
   ```ini
   [minio]
   type = s3
   provider = Minio
   endpoint = http://minio:9000
   access_key_id = <S3_ACCESS_KEY из .env>
   secret_access_key = <S3_SECRET_KEY из .env>
   region = us-east-1
   force_path_style = true

   [cloud]
   type = yandex
   token = {"access_token":"...","token_type":"OAuth","refresh_token":"...","expiry":"..."}
   ```
   Смена облака = замена секции `[cloud]` (yandex → dropbox/drive), код не трогается.

3. **Положить `rclone.conf` в volume `rclone_config`** (монтируется в `back` как
   `/config/rclone.conf` — путь из `RCLONE_CONFIG`). Способ на named-volume:
   ```bash
   docker compose up -d minio                     # том создаётся при первом использовании
   docker run --rm -v portfolio_rclone_config:/config -v "$PWD":/src alpine \
     sh -c 'cp /src/rclone.conf /config/rclone.conf'
   rm rclone.conf                                 # локальную копию удалить (секрет)
   ```
   (Имя тома = `<project>_rclone_config`; `docker volume ls` покажет точное.)

4. **Включить бэкап**: `BACKUP_ENABLED=true` в `.env`, затем `make up`.

Детали модуля и раскладка в облаке — [`../back/src/backup/README.md`](../back/src/backup/README.md).

## 6. Восстановление из облака (fresh deploy / disaster recovery)

Named-volume Docker переживает `docker compose down` (без `-v`) и рестарт — данные не обнуляются.
Реальный риск — потеря/пересоздание VPS. От этого защищает off-site бэкап + restore-on-boot:

1. Развернуть стек на новом сервере (§3–§5) с тем же `rclone.conf` (тот же токен облака).
2. На старте `back` при **пустом** окружении (пустой bucket `media` и отсутствующий `db.sqlite`)
   автоматически: дожидается MinIO → тянет **картинки** (`rclone sync cloud→minio`) → тянет **БД**
   (`rclone copyto cloud→/data/db.sqlite`) → прогоняет миграции → обслуживает. Порядок
   картинки→БД гарантирует, что БД не сошлётся на ещё не залитую картинку.
3. Restore идемпотентен: срабатывает только на пустом окружении, на обычных рестартах — no-op.

Если облако недоступно/пусто — стартуем с пустой БД (новый проект), это норма.

## 7. Эксплуатация

```bash
make up            # поднять/пересобрать (docker compose up -d --build)
make down          # остановить (volume'ы сохраняются)
make ps            # статус (ожидаем caddy+back+minio healthy)
make logs-caddy    # логи edge/TLS   (make logs-back / logs-minio — прочие)
make restart       # рестарт
```

Обновление кода: `git pull && make up` (пересоберёт образы, статика фронта/админки обновится,
`back` перезапустится, restore-on-boot no-op т.к. данные на месте).

## 8. Безопасность (сводка)

- Наружу опубликован **только `caddy`** (80/443). `back:3001` и MinIO (API 9000 / консоль 9001)
  портов не имеют — доступны лишь во внутренней сети compose.
- Бэкенд ходит в MinIO **не под root**, а отдельным app-ключом (`S3_ACCESS_KEY`), ограниченным
  бакетом `media`. Root-креды MinIO не передаются в `back`.
- Public-read (анонимный `s3:GetObject`) — строго на `images/*`; всё прочее в бакете приватно.
- Секреты (`JWT_SECRET`, `ADMIN_PASSWORD_HASH`, `MINIO_*`, `S3_*`, токен облака) — только в `.env`
  и volume `rclone_config`; не в образе и не в репозитории.
- Админка: пароль как argon2id-хэш, JWT в httpOnly+Secure+SameSite cookie, rate-limit логина,
  CSRF-защита мутаций (см. `back/src/auth`).
- `/media/*` и хешированные ассеты Vite отдаются с `Cache-Control: immutable` (год).

## 9. Локальный прод-подобный прогон (без домена)

Проверить весь контейнерный стек на машине разработчика (без реального TLS):

```bash
# в .env:
SITE_ADDRESS=:80          # без домена → обычный HTTP, без Let's Encrypt
HTTP_PORT=8080            # если 80/443 заняты — любые свободные порты
HTTPS_PORT=8443
COOKIE_SECURE=false       # cookie логина по HTTP (Secure-cookie браузер по HTTP отбросит)
make up
curl -fsS http://localhost:8080/api/health   # → ok
```

Это только для локальной проверки — на проде `SITE_ADDRESS=<домен>`, `HTTP_PORT/HTTPS_PORT=80/443`,
`COOKIE_SECURE=true`.
