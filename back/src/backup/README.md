# Backup / restore (rclone) — модуль и настройка

Off-site бэкап БД+картинок в облако (дебаунс по изменению) и restore на старте при пустом
окружении. Спека: [`docs/architecture.md` §9/§11](../../../docs/architecture.md). Задача: `tasks/11-backup-restore`.

## Модули

| Файл          | Что                                                                                  |
| ------------- | ------------------------------------------------------------------------------------ |
| `config.ts`   | `loadBackupConfig()` — env `BACKUP_*` / `RCLONE_CONFIG` → типизированный конфиг.      |
| `runner.ts`   | Инъектируемый раннер команд (`createCommandRunner`, Bun.spawn) + `createRclone` обёртка (`sync`/`copyto`/`lsf`/`deletefile`). |
| `debounce.ts` | `createDebouncer` — `markDirty()` сбрасывает окно тишины; single-flight + коалесинг.  |
| `push.ts`     | `runPush` — VACUUM-снимок → `sync` картинок → `copyto` БД + версия в `history/` → retention. Плюс `snapshotDatabase`, `selectVersionsToDelete`, `resolveBackupPaths`. |
| `restore.ts`  | `restoreOnBoot` — ждёт MinIO, restore картинок→БД только если пусто (идемпотентно); `pollUntilReady`, `minioHealthy`. |

Подключение — `src/index.ts`: `onMutation()` (§9) → `debouncer.markDirty()`; `restoreOnBoot(...)`
вызывается **до** `openDb()`. Ошибки бэкапа логируются, приложение не падает.

## Порядок (критично)

**Картинки → БД** и в push, и в restore: облачная БД не должна ссылаться на ещё не залитые
картинки. «Осиротевшие» картинки безвредны, обратное — нет.

## Раскладка в облаке

```
<BACKUP_REMOTE>/                 # напр. cloud:proksion
├── media/**                     # зеркало MinIO-бакета (rclone sync)
└── db/
    ├── db.sqlite                # каноничная копия
    └── history/db-<ts>.sqlite   # версии, retention = BACKUP_HISTORY_KEEP
```

## Настройка `rclone.conf` (один раз)

Нужны **два remote**: `minio` (S3 к нашему MinIO) и `cloud` (облако — рекомендуется Yandex.Disk;
Dropbox/GDrive — drop-in заменой секции `[cloud]`, код не меняется).

1. **Токен облака** (пример Yandex.Disk) — на машине с браузером:
   ```bash
   rclone authorize yandex          # откроет браузер, вернёт JSON-токен в консоль
   ```
   (Dropbox → `rclone authorize dropbox`, Google Drive → `rclone authorize drive`.)

2. **Собрать `rclone.conf`** (подставь свои значения; `token` — из шага 1):
   ```ini
   [minio]
   type = s3
   provider = Minio
   endpoint = http://minio:9000
   access_key_id = proksion
   secret_access_key = change-me-please
   region = us-east-1
   force_path_style = true

   [cloud]
   type = yandex
   token = {"access_token":"...","token_type":"OAuth","refresh_token":"...","expiry":"..."}
   ```
   `minio`-креды = `S3_ACCESS_KEY`/`S3_SECRET_KEY` из `.env`.

3. **Проверить:**
   ```bash
   rclone --config ./rclone.conf lsd minio:       # видит бакет media
   rclone --config ./rclone.conf lsd cloud:       # видит облако
   ```

4. **Положить на сервер** в volume `rclone_config` (монтируется в `back` как `/config/rclone.conf`,
   read-only — путь из `RCLONE_CONFIG`). Файл живёт только на сервере, в репозиторий/образ НЕ
   попадает. Полный секрет-хардненинг (docker secret) — задача 12.

5. Включить бэкап: `BACKUP_ENABLED=true` в `.env`.

## Тесты

`cd back && bun test src/backup` — логика (дебаунс/retention/порядок push/ветвление restore) на
мок-раннере. Интеграция против **реального** `rclone` (local-remote, облако не нужно) в
`runner.test.ts` гейтится наличием бинаря (`Bun.which('rclone')`) — без него помечается skipped.
