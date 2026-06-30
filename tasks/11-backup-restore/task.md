# Task — 11 backup-restore

**Слой:** `/back` + инфра. **Методология:** **TDD** для логики (дебаунс/retention/порядок);
rclone-вызовы — интеграция. Спека: §9, §11, §5, §3.

## Цель
Бэкенд автоматически выгружает БД+картинки в облако (дебаунс по изменению) и восстанавливает их
на старте при пустом окружении. Облако взаимозаменяемо (Yandex/Dropbox/GDrive) через rclone.

## Шаги

1. **Вендор rclone** — добавить бинарь `rclone` в образ `back` (multi-stage `COPY --from=rclone/rclone`
   или установка). `rclone.conf` монтируется секретом/volume (`RCLONE_CONFIG`), два remote:
   `minio` (s3) и `cloud` (yandex/dropbox/drive). Документировать одноразовый
   `rclone authorize yandex`.
2. **spawn-обёртка** (`backup/runner.ts`) — инъектируемый раннер внешних команд (`rclone`,
   `VACUUM INTO`) для тестируемости. TDD: команды формируются корректно (мок).
3. **debounce** (`backup/debounce.ts`, TDD first) — `markDirty()` сбрасывает таймер
   `BACKUP_DEBOUNCE_MINUTES`; single-flight (одновременно один бэкап); коалесинг множественных
   изменений в один прогон.
4. **push** (`backup/push.ts`) — по срабатыванию: `VACUUM INTO` снимок → `rclone sync minio→cloud`
   (**картинки первыми**) → `rclone copyto db→cloud` + версия в `history/`. Retention: оставить
   `BACKUP_HISTORY_KEEP`, удалить старые. TDD: порядок шагов; функция выбора версий к удалению.
5. **restore-on-boot** (`backup/restore.ts`) — на старте: дождаться `minio` healthy; если bucket
   пуст → `rclone sync cloud→minio`; если `/data/db.sqlite` нет → `copyto cloud→local`; порядок
   картинки→БД; идемпотентно (пропуск, если данные есть). TDD: ветвление «пусто/не пусто».
6. **Подключение хука** — связать `onMutation()` (задача 06) с `markDirty()`. Вызвать `restore`
   до открытия БД/обслуживания. Ошибки бэкапа — логировать, не ронять приложение.

## Требования
- Порядок **картинки → БД** в push И restore — строго (см. context).
- Strict TS, без `any`. Без облака приложение стартует и работает (restore с пустой БД = норма).
- Конфиг через env (§11). Токен облака — только в `rclone.conf` (не в репо/образе).

## Deliverables
`back/src/backup/{runner,debounce,push,restore}.ts`, вендоренный rclone в образе, подключение к
`onMutation`/boot, тесты логики + инструкция настройки `rclone.conf`. `bun test` зелёный.
</content>
