// Дебаунс+коалесинг+single-flight для push-бэкапа (docs/architecture.md §9).
// markDirty() (по onMutation §9) сбрасывает таймер тишины; по истечении — один прогон.
// Пока прогон идёт, новые markDirty() не запускают второй параллельно, а взводят ОДИН
// повтор после завершения (изменения во время бэкапа не теряются).

/** Планировщик отложенного вызова. Инъекция для тестов; дефолт — setTimeout/clearTimeout. */
export interface Scheduler {
  /** Запланировать `fn` через `ms`; вернуть функцию отмены. */
  set(fn: () => void, ms: number): () => void
}

const defaultScheduler: Scheduler = {
  set(fn, ms) {
    const handle = setTimeout(fn, ms)
    return () => clearTimeout(handle)
  },
}

export interface DebouncerDeps {
  /** Окно тишины перед прогоном, мс. */
  delayMs: number
  /** Одиночный прогон бэкапа. Отклонения ловятся в onError, не роняют дебаунсер. */
  run: () => Promise<void>
  scheduler?: Scheduler
  /** Обработчик ошибки прогона (лог). */
  onError?: (err: unknown) => void
}

export interface Debouncer {
  /** Пометить «данные изменились»: сбросить таймер или взвести повтор, если прогон идёт. */
  markDirty(): void
}

export function createDebouncer(deps: DebouncerDeps): Debouncer {
  const scheduler = deps.scheduler ?? defaultScheduler
  let cancel: (() => void) | null = null
  let running = false
  let rerun = false

  function schedule(): void {
    if (cancel) cancel()
    cancel = scheduler.set(fire, deps.delayMs)
  }

  function fire(): void {
    cancel = null
    void start()
  }

  async function start(): Promise<void> {
    if (running) {
      rerun = true
      return
    }
    running = true
    rerun = false
    try {
      await deps.run()
    } catch (err) {
      deps.onError?.(err)
    } finally {
      running = false
      if (rerun) {
        rerun = false
        schedule() // изменения во время прогона → ещё один прогон (после нового окна тишины)
      }
    }
  }

  return {
    markDirty() {
      if (running) {
        rerun = true
        return
      }
      schedule()
    },
  }
}
