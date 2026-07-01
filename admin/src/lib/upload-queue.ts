// Конечный автомат загрузки картинок (задача 08, шаг 3): очередь файлов, каждый проходит
// idle → uploading → done | error. Логика — чистый редьюсер + селекторы, чтобы покрыть юнит-
// тестами отдельно от компонента-загрузчика (который дёргает uploadWorkImage и диспатчит экшены).

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'

export interface UploadItem {
  /** Клиентский id элемента очереди (стабильный, не серверный). */
  id: string
  /** Имя файла — для отображения в списке. */
  name: string
  status: UploadStatus
  /** Прогресс 0..100 (имеет смысл в статусе uploading/done). */
  progress: number
  /** Текст ошибки (только в статусе error). */
  error?: string
}

export type UploadAction =
  | { type: 'enqueue'; items: { id: string; name: string }[] }
  | { type: 'start'; id: string }
  | { type: 'progress'; id: string; progress: number }
  | { type: 'success'; id: string }
  | { type: 'error'; id: string; error: string }
  | { type: 'remove'; id: string }
  | { type: 'clearSettled' }
  | { type: 'reset' }

const clamp = (n: number): number => Math.max(0, Math.min(100, Math.round(n)))

/** Чистый редьюсер очереди загрузки. */
export function uploadReducer(state: UploadItem[], action: UploadAction): UploadItem[] {
  switch (action.type) {
    case 'enqueue':
      return [
        ...state,
        ...action.items.map(
          (i): UploadItem => ({ id: i.id, name: i.name, status: 'idle', progress: 0 }),
        ),
      ]
    case 'start':
      return state.map((item) =>
        item.id === action.id
          ? { id: item.id, name: item.name, status: 'uploading', progress: 0 }
          : item,
      )
    case 'progress':
      return state.map((item) =>
        item.id === action.id && item.status === 'uploading'
          ? { ...item, progress: clamp(action.progress) }
          : item,
      )
    case 'success':
      return state.map((item) =>
        item.id === action.id
          ? { id: item.id, name: item.name, status: 'done', progress: 100 }
          : item,
      )
    case 'error':
      return state.map((item) =>
        item.id === action.id
          ? { id: item.id, name: item.name, status: 'error', progress: item.progress, error: action.error }
          : item,
      )
    case 'remove':
      return state.filter((item) => item.id !== action.id)
    case 'clearSettled':
      return state.filter((item) => item.status !== 'done' && item.status !== 'error')
    case 'reset':
      return []
    default:
      return state
  }
}

/** Первый элемент в очереди, ещё не начатый (для последовательной загрузки). */
export function nextPending(state: readonly UploadItem[]): UploadItem | undefined {
  return state.find((item) => item.status === 'idle')
}

/** Все элементы завершены (done/error) — нет idle/uploading. */
export function isAllSettled(state: readonly UploadItem[]): boolean {
  return state.length > 0 && state.every((i) => i.status === 'done' || i.status === 'error')
}

/** Идёт ли активная загрузка (есть uploading или ещё не начатые idle). */
export function isBusy(state: readonly UploadItem[]): boolean {
  return state.some((i) => i.status === 'uploading' || i.status === 'idle')
}

/** Сводный прогресс очереди 0..100 (среднее по элементам). */
export function overallProgress(state: readonly UploadItem[]): number {
  if (state.length === 0) return 0
  const sum = state.reduce((acc, i) => acc + (i.status === 'done' ? 100 : i.progress), 0)
  return clamp(sum / state.length)
}
