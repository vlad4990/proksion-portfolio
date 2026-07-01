// Restore-on-boot (docs/architecture.md §9): на СВЕЖЕМ (пустом) окружении тянем данные из
// облака ДО открытия БД. Идемпотентно — если данные уже есть, пропуск. Порядок «картинки → БД».
// Устойчивость: сбой облака не фатален (логируем, стартуем с тем, что есть локально).

export interface RestoreDeps {
  /** Дождаться готовности MinIO (poll health). `false` → restore пропускается целиком. */
  waitForMinio: () => Promise<boolean>
  /** Подготовить хранилище (ensure bucket + policy) до проверки пустоты. Идемпотентно. */
  prepareStorage?: () => Promise<void>
  /** Пусто ли хранилище картинок (нет объектов images/*). */
  isBucketEmpty: () => Promise<boolean>
  /** Есть ли локальный файл БД. */
  dbExists: () => boolean
  /** rclone sync cloud→minio (картинки). */
  restoreImages: () => Promise<void>
  /** rclone copyto cloud→local (БД). */
  restoreDb: () => Promise<void>
  log?: (msg: string) => void
}

export interface RestoreOutcome {
  minioReady: boolean
  imagesRestored: boolean
  dbRestored: boolean
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * Однократный restore на старте. Возвращает, что удалось восстановить. Никогда не бросает:
 * любой сбой облака/хранилища логируется и деградирует (§9 — «стартуем с пустой БД, это норма»).
 */
export async function restoreOnBoot(deps: RestoreDeps): Promise<RestoreOutcome> {
  const outcome: RestoreOutcome = { minioReady: false, imagesRestored: false, dbRestored: false }
  const log = deps.log ?? (() => {})

  let ready = false
  try {
    ready = await deps.waitForMinio()
  } catch (err) {
    log(`restore: ошибка ожидания MinIO (${messageOf(err)})`)
  }
  outcome.minioReady = ready
  if (!ready) {
    log('restore: MinIO не готов — пропускаю restore, старт с локальными данными')
    return outcome
  }

  if (deps.prepareStorage) {
    try {
      await deps.prepareStorage()
    } catch (err) {
      log(`restore: подготовка хранилища не удалась (${messageOf(err)})`)
    }
  }

  // Картинки — раньше БД (строгий порядок §9).
  try {
    if (await deps.isBucketEmpty()) {
      log('restore: bucket пуст → тяну картинки из облака')
      await deps.restoreImages()
      outcome.imagesRestored = true
    } else {
      log('restore: картинки на месте — пропуск')
    }
  } catch (err) {
    log(`restore: восстановление картинок не удалось, продолжаю (${messageOf(err)})`)
  }

  try {
    if (!deps.dbExists()) {
      log('restore: локальной БД нет → тяну БД из облака')
      await deps.restoreDb()
      outcome.dbRestored = true
    } else {
      log('restore: БД на месте — пропуск')
    }
  } catch (err) {
    log(`restore: восстановление БД не удалось, старт с пустой БД (${messageOf(err)})`)
  }

  return outcome
}

export interface PollOptions {
  /** Максимум попыток. */
  attempts: number
  /** Пауза между попытками, мс. */
  delayMs: number
  /** Источник паузы (инъекция для тестов). */
  sleep: (ms: number) => Promise<void>
}

/**
 * Опрашивает `check` до первого успеха или исчерпания попыток. Исключение в `check`
 * трактуется как «не готов» (не роняет опрос). Между попытками — пауза `delayMs`.
 */
export async function pollUntilReady(
  check: () => Promise<boolean>,
  opts: PollOptions,
): Promise<boolean> {
  for (let i = 0; i < opts.attempts; i++) {
    let ok = false
    try {
      ok = await check()
    } catch {
      ok = false
    }
    if (ok) return true
    if (i < opts.attempts - 1) await opts.sleep(opts.delayMs)
  }
  return false
}

/** Health-URL MinIO из S3-эндпоинта (`http://minio:9000` → `http://minio:9000/minio/health/live`). */
export function minioHealthUrl(endpoint: string): string {
  return `${new URL(endpoint).origin}/minio/health/live`
}

/** Одна проба доступности MinIO (короткий таймаут, любой сетевой сбой → false). */
export async function minioHealthy(endpoint: string): Promise<boolean> {
  try {
    const res = await fetch(minioHealthUrl(endpoint), { signal: AbortSignal.timeout(1500) })
    return res.ok
  } catch {
    return false
  }
}
