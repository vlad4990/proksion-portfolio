// Маленький хук загрузки ресурса: грузит данные через fetcher(signal), отслеживает
// loading/error, поддерживает reload() и отменяет запрос при размонтировании/смене зависимостей.

import { useCallback, useEffect, useState, type DependencyList } from 'react'

import { apiErrorMessage } from '@/lib/errors'

export interface Resource<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

export function useResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
): Resource<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    fetcher(ctrl.signal)
      .then((result) => {
        if (!ctrl.signal.aborted) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(apiErrorMessage(err))
        setLoading(false)
      })
    return () => ctrl.abort()
    // fetcher намеренно вне зависимостей — перезапуск по deps/nonce
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  return { data, loading, error, reload }
}
