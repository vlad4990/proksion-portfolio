// Человекочитаемое сообщение из ошибки API (контракт тел ошибок бэка — `{ error, detail? }`).
// Используется для toast'ов и инлайновых ошибок форм.

import { ApiError } from '@/api/client'

const MESSAGES: Record<string, string> = {
  bad_request: 'Некорректные данные',
  not_found: 'Не найдено',
  unauthorized: 'Требуется вход',
  csrf_required: 'Запрос отклонён (CSRF)',
  too_many_requests: 'Слишком много попыток. Попробуйте позже.',
  internal_error: 'Внутренняя ошибка сервера',
  storage_unavailable: 'Хранилище недоступно',
}

export function apiErrorMessage(err: unknown, fallback = 'Что-то пошло не так'): string {
  if (err instanceof ApiError) {
    const code = err.body?.error
    if (code && MESSAGES[code]) {
      const base = MESSAGES[code]
      return err.body?.detail ? `${base}: ${err.body.detail}` : base
    }
    if (err.status === 0) return 'Нет соединения с сервером'
    return `Ошибка ${err.status}`
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}
