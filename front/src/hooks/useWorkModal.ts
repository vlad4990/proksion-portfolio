// Контроллер модалки работы (задача 10), общий для ОБОИХ деревьев (desktop + mobile) —
// вся не-визуальная логика здесь, разметка остаётся раздельной по конвенции двойного дерева.
//
// • Грузит деталь работы по слагам из URL (useWorkDetail).
// • Активный слайд — производное от `?img=<imageId>` (единственный источник правды = URL):
//   шаринг конкретной картинки работает, канонический путь работы дублей не плодит.
// • Esc / стрелки клавиатуры; close() → navigate назад на листинг `/projects/:cat/:sub`.
// • 404 → редирект на листинг (не белый экран).

import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useWorkDetail, type WorkStatus } from '../api/useWorkDetail'
import { ROUTE_TITLES, workTitle } from '../seo'
import type { ImageDetail, WorkDetailById } from '../api/types'

export interface WorkModalController {
  status: WorkStatus
  detail: WorkDetailById | null
  images: ImageDetail[]
  count: number
  activeIndex: number
  activeImage: ImageDetail | undefined
  /** Перейти к слайду по индексу (пишет `?img=<imageId>`, replace — без мусора в истории). */
  goTo: (index: number) => void
  next: () => void
  prev: () => void
  /** Закрыть модалку → navigate назад на листинг подкатегории. */
  close: () => void
}

export function useWorkModal(): WorkModalController {
  // `work` — числовой id работы (вариант B), а не slug.
  const { cat, sub, work } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { detail, status } = useWorkDetail(work)

  const images = detail?.images ?? []
  const count = images.length

  // Активный индекс выводим из ?img=<imageId>; невалидный/отсутствует → первый слайд.
  const imgParam = searchParams.get('img')
  const idxFromParam = imgParam ? images.findIndex((i) => String(i.id) === imgParam) : -1
  const activeIndex = idxFromParam >= 0 ? idxFromParam : 0
  const activeImage = images[activeIndex]

  const listingPath = cat && sub ? `/projects/${cat}/${sub}` : '/projects'

  const goTo = (index: number): void => {
    const img = images[index]
    if (!img) return
    const next = new URLSearchParams(searchParams)
    next.set('img', String(img.id))
    setSearchParams(next, { replace: true })
  }
  const next = (): void => {
    if (count > 1) goTo((activeIndex + 1) % count)
  }
  const prev = (): void => {
    if (count > 1) goTo((activeIndex - 1 + count) % count)
  }
  const close = (): void => {
    navigate(listingPath)
  }

  // 404 → редирект на листинг (идемпотентно; не белый экран).
  useEffect(() => {
    if (status === 'notfound') navigate(listingPath, { replace: true })
  }, [status, listingPath, navigate])

  // Заголовок вкладки = название работы; при закрытии возвращаем заголовок листинга
  // (route не меняется — эффект App не перезапустится).
  useEffect(() => {
    if (status !== 'ready' || !detail) return
    document.title = workTitle(detail.title)
    return () => {
      document.title = ROUTE_TITLES.projects
    }
  }, [status, detail])

  // Клавиатура: Esc закрывает всегда; стрелки листают карусель (когда есть что листать).
  // Эффект пересубскрайбится при смене activeIndex/count → замыкания всегда свежие.
  useEffect(() => {
    const onKeydown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      } else if (e.key === 'ArrowRight' && count > 1) {
        e.preventDefault()
        next()
      } else if (e.key === 'ArrowLeft' && count > 1) {
        e.preventDefault()
        prev()
      }
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [activeIndex, count, listingPath])

  return { status, detail, images, count, activeIndex, activeImage, goTo, next, prev, close }
}
