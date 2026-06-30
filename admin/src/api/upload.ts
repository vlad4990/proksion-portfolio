// Multipart-загрузка картинки работы (POST /admin/works/:id/images, docs/architecture.md §6/§7).
// fetch не отдаёт прогресс аплоада, поэтому используем XMLHttpRequest (xhr.upload.onprogress).
// Переиспользуем те же инварианты, что и api-клиент (src/api/client.ts): base /api, cookie-сессия
// (withCredentials), CSRF-заголовок X-Requested-With, централизованный разлогин на 401.
// Content-Type НЕ ставим — браузер сам выставит multipart/form-data с boundary.

import { ApiError, API_BASE, CSRF_HEADER, notifyUnauthorized, type ApiErrorBody } from './client'
import type { ImageRow } from './types'

export interface UploadOptions {
  /** alt-текст картинки (необязателен). Пустой/пробельный — не отправляется. */
  alt?: string | null
  /** Колбэк прогресса: 0..100 (только пока сервер принимает байты). */
  onProgress?: (percent: number) => void
  /** Отмена загрузки. */
  signal?: AbortSignal
}

function parseErrorBody(text: string): ApiErrorBody | null {
  if (text === '') return null
  try {
    const parsed: unknown = JSON.parse(text)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'error' in parsed &&
      typeof (parsed as Record<string, unknown>).error === 'string'
    ) {
      return parsed as ApiErrorBody
    }
  } catch {
    // не-JSON тело — отдадим null
  }
  return null
}

/**
 * Загружает один файл в работу. Резолвится созданной строкой `image` (back возвращает 201 + row),
 * реджектится `ApiError` (с распарсенным телом) либо `DOMException('AbortError')` при отмене.
 */
export function uploadWorkImage(
  workId: number,
  file: File,
  opts: UploadOptions = {},
): Promise<ImageRow> {
  return new Promise<ImageRow>((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    const alt = opts.alt?.trim()
    if (alt) form.append('alt', alt)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/admin/works/${workId}/images`)
    xhr.withCredentials = true
    xhr.setRequestHeader(CSRF_HEADER, 'fetch')

    if (opts.signal) {
      if (opts.signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'))
        return
      }
      opts.signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts.onProgress) {
        opts.onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      const body = xhr.responseText
      if (xhr.status >= 200 && xhr.status < 300) {
        opts.onProgress?.(100)
        try {
          resolve(JSON.parse(body) as ImageRow)
        } catch {
          reject(new ApiError(xhr.status, null))
        }
        return
      }
      if (xhr.status === 401) notifyUnauthorized()
      reject(new ApiError(xhr.status, parseErrorBody(body)))
    }

    xhr.onerror = () => reject(new ApiError(0, null))
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'))

    xhr.send(form)
  })
}
