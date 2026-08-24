// Контроллер модалки работы, общий для ОБОИХ деревьев (desktop + mobile) —
// вся не-визуальная логика здесь, разметка остаётся раздельной по конвенции двойного дерева.
//
// Карусели больше нет: картинки работы показываются вертикальной лентой, поэтому
// слайд-состояние `?img=` не используется (легаси-ссылки с ним продолжают открываться —
// параметр просто игнорируется, все картинки и так на экране).
//
// • Грузит деталь работы по слагам из URL (useWorkDetail): `:work` — СЛАГ работы.
//   Легаси-ссылки с числовым id продолжают открываться (деталь по id) и сразу же
//   `replace`-редиректятся на канонический слаговый URL — история не засоряется.
// • Esc / крестик / клик по фону → close(): анимация закрытия дерева (runClose),
//   затем navigate назад на листинг. 404 → редирект на листинг (не белый экран).

import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { useWorkDetail, type WorkStatus } from '../api/useWorkDetail'
import { ROUTE_TITLES, workTitle } from '../seo'
import type { ImageDetail, WorkDetail } from '../api/types'

export interface WorkModalController {
  status: WorkStatus
  detail: WorkDetail | null
  images: ImageDetail[]
  /** Сегмент `:work` из URL (слаг или легаси-id) — ключ FLIP-источника (lib/flip). */
  work: string | undefined
  /** Закрыть модалку: анимация закрытия (если передана) → шаг назад на листинг. */
  close: () => void
}

/**
 * @param runClose Анимация закрытия от разметки дерева: получает `finish` (навигацию назад)
 * и обязана вызвать его по завершении анимации. Не передана → закрытие мгновенное.
 * Повторные close() на время проигрывания гасятся.
 */
export function useWorkModal(runClose?: (finish: () => void) => void): WorkModalController {
  // `work` — СЛАГ работы; числовое значение = легаси-ссылка (см. useWorkDetail).
  const { cat, sub, work } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { detail, status, canonicalPath } = useWorkDetail(cat, sub, work)

  const images = detail?.images ?? []
  const listingPath = cat && sub ? `/projects/${cat}/${sub}` : '/projects'

  // Закрытие возвращает на ТОТ листинг, с которого работу открыли (спека редизайна §1.3):
  // канонический путь работы всегда содержит подкатегорию, но открыть её могли и с таба
  // «ВСЕ» (`/projects/:cat`), и с корневой в тег-режиме — из URL это не вывести, поэтому
  // шаг назад по истории. Deep-link (первая запись истории, `key === 'default'`) шага назад
  // не имеет — там уходим на листинг подкатегории. Флаг фиксируем на первом рендере:
  // `replace`-канонизация легаси-URL меняет `key`, а решение должно остаться прежним.
  const [openedInApp] = useState(() => location.key !== 'default')
  const closing = useRef(false)
  // Гард на «finish после размонтирования»: если модалку сняла сама история (browser-back
  // во время анимации закрытия), отложенный navigate(-1) сделал бы ВТОРОЙ шаг назад.
  // true выставляем в setup (не в инициализаторе ref) — StrictMode маунтит дважды,
  // и после cleanup первого маунта флаг должен вернуться.
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const close = (): void => {
    if (closing.current) return
    const finish = (): void => {
      if (!mounted.current) return
      if (openedInApp) navigate(-1)
      else navigate(listingPath, { replace: true })
    }
    if (runClose) {
      closing.current = true
      runClose(finish)
    } else {
      finish()
    }
  }

  // 404 → редирект на листинг (идемпотентно; не белый экран).
  useEffect(() => {
    if (status === 'notfound') navigate(listingPath, { replace: true })
  }, [status, listingPath, navigate])

  // Легаси-ссылка с числовым id → канонический слаговый URL (`replace` — история чистая).
  useEffect(() => {
    if (canonicalPath) navigate(canonicalPath, { replace: true })
  }, [canonicalPath, navigate])

  // Заголовок вкладки = название работы; при закрытии возвращаем заголовок листинга
  // (route не меняется — эффект App не перезапустится).
  useEffect(() => {
    if (status !== 'ready' || !detail) return
    document.title = workTitle(detail.title)
    return () => {
      document.title = ROUTE_TITLES.projects
    }
  }, [status, detail])

  // Esc закрывает. Подписка одна на всю жизнь модалки; актуальный close — через ref
  // (runClose пересоздаётся каждый рендер, пересубскрайбливаться из-за него не нужно).
  const closeRef = useRef(close)
  closeRef.current = close
  useEffect(() => {
    const onKeydown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeRef.current()
      }
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [])

  return { status, detail, images, work, close }
}
