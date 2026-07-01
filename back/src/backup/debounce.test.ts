import { describe, expect, test } from 'bun:test'
import { createDebouncer, type Scheduler } from './debounce.ts'

// Управляемый планировщик: время не течёт само, продвигаем вручную через advance().
function fakeScheduler() {
  interface Task {
    id: number
    fn: () => void
    at: number
  }
  let now = 0
  let seq = 0
  let tasks: Task[] = []
  const scheduler: Scheduler = {
    set(fn, ms) {
      const id = ++seq
      tasks.push({ id, fn, at: now + ms })
      return () => {
        tasks = tasks.filter((t) => t.id !== id)
      }
    },
  }
  return {
    scheduler,
    advance(ms: number) {
      now += ms
      const due = tasks.filter((t) => t.at <= now).sort((a, b) => a.at - b.at)
      tasks = tasks.filter((t) => t.at > now)
      for (const t of due) t.fn()
    },
    pending: () => tasks.length,
  }
}

// Пропустить очередь микротасков (чтобы отработали async-продолжения run()/finally).
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe('createDebouncer', () => {
  test('markDirty сбрасывает таймер: прогон не раньше, чем окно тишины после ПОСЛЕДНЕГО markDirty', async () => {
    const s = fakeScheduler()
    let runs = 0
    const d = createDebouncer({ delayMs: 100, run: async () => void runs++, scheduler: s.scheduler })

    d.markDirty() // таймер на 100
    s.advance(50) // t=50
    d.markDirty() // сброс → таймер на 150
    s.advance(50) // t=100 — исходный срок, но был сброшен
    expect(runs).toBe(0)
    s.advance(50) // t=150 → срабатывает
    await tick()
    expect(runs).toBe(1)
  })

  test('коалесинг: множество markDirty в окне → один прогон', async () => {
    const s = fakeScheduler()
    let runs = 0
    const d = createDebouncer({ delayMs: 100, run: async () => void runs++, scheduler: s.scheduler })

    d.markDirty()
    d.markDirty()
    d.markDirty()
    s.advance(100)
    await tick()
    expect(runs).toBe(1)
  })

  test('single-flight: во время прогона второй не стартует; изменения коалесятся в один повтор', async () => {
    const s = fakeScheduler()
    let calls = 0
    let release!: () => void
    const run = () => {
      calls++
      return new Promise<void>((resolve) => {
        release = resolve
      })
    }
    const d = createDebouncer({ delayMs: 100, run, scheduler: s.scheduler })

    d.markDirty()
    s.advance(100) // прогон #1 стартует и «зависает» на release
    await tick()
    expect(calls).toBe(1)

    d.markDirty() // во время прогона — только флаг повтора
    d.markDirty()
    expect(calls).toBe(1) // второй параллельно НЕ запущен
    expect(s.pending()).toBe(0) // таймер во время прогона не ставится

    release() // завершаем прогон #1
    await tick()
    expect(s.pending()).toBe(1) // повтор запланирован (коалесинг изменений во время прогона)

    s.advance(100)
    await tick()
    expect(calls).toBe(2) // ровно один повторный прогон
  })

  test('ошибка прогона не фатальна: уходит в onError, дебаунсер продолжает работать', async () => {
    const s = fakeScheduler()
    let caught: unknown = null
    const d = createDebouncer({
      delayMs: 10,
      run: async () => {
        throw new Error('boom')
      },
      scheduler: s.scheduler,
      onError: (e) => void (caught = e),
    })

    d.markDirty()
    s.advance(10)
    await tick()
    expect(caught).toBeInstanceOf(Error)

    // после ошибки дебаунсер всё ещё принимает markDirty
    let ran = false
    const d2 = createDebouncer({
      delayMs: 10,
      run: async () => void (ran = true),
      scheduler: s.scheduler,
    })
    d2.markDirty()
    s.advance(10)
    await tick()
    expect(ran).toBe(true)
  })
})
