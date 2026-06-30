import { useEffect, useReducer, useRef } from 'react'
import { Upload } from 'lucide-react'

import { uploadWorkImage } from '@/api/upload'
import type { ImageRow } from '@/api/types'
import { apiErrorMessage } from '@/lib/errors'
import {
  isBusy,
  nextPending,
  overallProgress,
  uploadReducer,
  type UploadItem,
} from '@/lib/upload-queue'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ImageUploaderProps {
  workId: number
  /** Вызывается на каждую успешно загруженную картинку (для оптимистичного апдейта/реестра). */
  onUploaded?: (image: ImageRow) => void
  /** Вызывается один раз, когда вся очередь завершилась (для рефетча детали работы). */
  onSettled?: () => void
}

const statusLabel: Record<UploadItem['status'], string> = {
  idle: 'в очереди',
  uploading: 'загрузка…',
  done: 'готово',
  error: 'ошибка',
}

/**
 * Мультизагрузка картинок в работу: очередь файлов грузится последовательно (state machine
 * src/lib/upload-queue.ts), с индивидуальным прогрессом и обработкой ошибок (задача 08, шаг 3).
 */
export function ImageUploader({ workId, onUploaded, onSettled }: ImageUploaderProps) {
  const [queue, dispatch] = useReducer(uploadReducer, [])
  const files = useRef<Map<string, File>>(new Map())
  const counter = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const settledNotified = useRef(true)

  // Последовательная загрузка: пока есть pending и нет активной загрузки — стартуем следующий.
  useEffect(() => {
    if (queue.some((i) => i.status === 'uploading')) return
    const pending = nextPending(queue)
    if (!pending) {
      if (!settledNotified.current && queue.length > 0) {
        settledNotified.current = true
        onSettled?.()
      }
      return
    }
    const file = files.current.get(pending.id)
    if (!file) {
      dispatch({ type: 'error', id: pending.id, error: 'Файл потерян' })
      return
    }
    dispatch({ type: 'start', id: pending.id })
    uploadWorkImage(workId, file, {
      onProgress: (percent) => dispatch({ type: 'progress', id: pending.id, progress: percent }),
    })
      .then((image) => {
        dispatch({ type: 'success', id: pending.id })
        onUploaded?.(image)
      })
      .catch((err: unknown) => {
        dispatch({ type: 'error', id: pending.id, error: apiErrorMessage(err) })
      })
  }, [queue, workId, onUploaded, onSettled])

  const onPick = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const items: { id: string; name: string }[] = []
    for (const file of Array.from(fileList)) {
      const id = `u${counter.current++}`
      files.current.set(id, file)
      items.push({ id, name: file.name })
    }
    settledNotified.current = false
    dispatch({ type: 'enqueue', items })
    if (inputRef.current) inputRef.current.value = ''
  }

  const busy = isBusy(queue)
  const progress = overallProgress(queue)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          aria-label="Выбрать файлы"
          onChange={(e) => onPick(e.target.files)}
        />
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          <Upload />
          Загрузить картинки
        </Button>
        {busy && (
          <span className="text-sm text-muted-foreground" role="status">
            Загрузка {progress}%
          </span>
        )}
        {queue.length > 0 && !busy && (
          <Button type="button" variant="ghost" size="sm" onClick={() => dispatch({ type: 'reset' })}>
            Очистить список
          </Button>
        )}
      </div>

      {queue.length > 0 && (
        <ul className="space-y-1">
          {queue.map((item) => (
            <li key={item.id} className="rounded-md border px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate">{item.name}</span>
                <span
                  className={cn(
                    'shrink-0 text-xs',
                    item.status === 'error' ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {statusLabel[item.status]}
                </span>
              </div>
              {item.status === 'error' ? (
                <p className="mt-1 text-xs text-destructive">{item.error}</p>
              ) : (
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${item.progress}%` }}
                    role="progressbar"
                    aria-valuenow={item.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
