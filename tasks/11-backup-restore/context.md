# Context — 11 backup-restore

## Цель в одной строке
Off-site бэкап через rclone: дебаунс-пуш (БД + картинки) в облако по изменению и restore из
облака на старте, если данных нет (свежий VPS).

## Опорные разделы спеки
- §9 (вся механика: rclone, два remote, push-порядок, restore-on-boot, retention), §11
  (env `BACKUP_*`, `RCLONE_CONFIG`), §5 (MinIO как S3-remote), §3 (SQLite/`VACUUM INTO`).

## Что уже есть
- Storage/MinIO (04), admin-API с хуком `onMutation()` (06), SQLite (02).

## Методология
- **TDD** для чистой логики: дебаунс/коалесинг, выбор файлов для retention, порядок операций.
  Обёртка над `rclone`/`VACUUM` — инъектируемая (spawn-раннер мокается в тестах).
- Реальные rclone-вызовы — интеграционно (можно против local-remote или тестового бакета).

## Механика (§9)
- Два remote в `rclone.conf`: `minio` (type s3, endpoint `minio:9000`) и `cloud`
  (type yandex/dropbox/drive — рекомендуется **Yandex.Disk**). rclone вендорится в образ `back`.
- **Push** (по `onMutation`, дебаунс `BACKUP_DEBOUNCE_MINUTES≈10`, single-flight):
  1) `VACUUM INTO` снимок БД; 2) `rclone sync minio:media → cloud` (**картинки первыми**);
  3) `rclone copyto db → cloud:.../db/db.sqlite` + версия в `history/` (retention `BACKUP_HISTORY_KEEP`).
- **Restore** (на старте, идемпотентно, только если пусто): дождаться `minio` healthy; если bucket
  пуст → `rclone sync cloud → minio:media`; если БД нет → `copyto cloud → /data/db.sqlite`.
  Порядок тоже **картинки → БД**.

## Инварианты / ограничения
- Порядок push/restore (картинки→БД) — критичен: облачная БД не должна ссылаться на ещё не
  залитые картинки. Строго соблюсти.
- Облако — единственная внешняя зависимость и **только для бэкапа**: при недоступности сайт
  работает, бэкап деградирует (логировать, не падать).
- Named volume переживает рестарт — restore срабатывает только на действительно пустом окружении.
- Strict TS, без `any`. Секреты/токен облака — в `rclone.conf` (секрет/volume), не в репо.

## На что НЕ замахиваться
Прод-хардненинг compose/секретов целиком — задача 12 (здесь только бэкап-модуль + вендор rclone).
</content>
