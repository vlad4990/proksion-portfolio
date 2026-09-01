// Псевдо-карусель десктопной модалки работы (флаг `work.carousel` в админке, включается
// при 2+ картинках). Вместо вертикальной ленты: центральный слайд по центру экрана,
// соседние картинки виднеются у краёв в градиентном блюре (у кромки слайда — резко,
// к краю экрана — максимальный блюр), поверх блюра — стрелки. Все слайды одной высоты —
// высота вьюпорта (100dvh − 2·edge-y − мета), ширина — по аспекту картинки (кап по edge-x).
//
// Блюр — БЕЗ backdrop-filter и БЕЗ mask-image: и то и другое Chrome (композитор) рисует
// с неверной геометрией — слайды пропадали, маскированные слои двоились не на своих местах
// (проверено вживую: без масок геометрия мгновенно чинится). Вместо этого градиент собран
// СТУПЕНЯМИ: поверх соседнего слайда — N вертикальных срезов его же блюр-копии (overflow
// + filter: blur + opacity, только безопасные примитивы) с нарастающими к краю экрана
// радиусом и плотностью. При перелистывании весь оверлей плавно гаснет transition'ом
// opacity — блюр «сходит» с картинки синхронно с её приездом в центр.
//
// Навигация: стрелки, клик по соседней картинке, колесо мыши (вертикальный скролл читаем
// как горизонтальный), горизонтальный свайп трекпада, клавиши ←/→. Перелистывание —
// CSS-transition transform у слайдов (компоузер), блюр-зоны и стрелки доезжают следом.
//
// Открытие: FLIP первой картинки из тайла листинга (как у ленты, lib/spring), остальное
// проявляется fade'ом. Закрытие анимирует WorkModal (runClose): центральный слайд летит
// обратно в тайл (только если центральна ПЕРВАЯ картинка), «оснастка» — элементы с
// data-caraux и некентральные слайды (data-carslide) — гаснет.

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type MutableRefObject,
} from 'react'
import type { ImageDetail } from '../../api/types'
import type { FlipSource } from '../../lib/flip'
import { fade, prefersReducedMotion, springTo } from '../../lib/spring'
import { WorkImage } from '../WorkImage'
import modalStyles from './WorkModal.module.css'
import styles from './WorkCarousel.module.css'

/** Полёт картинки из тайла — тот же спринг, что у ленты (WorkModal.FLY). */
const FLY = { stiffness: 300, damping: 30 }
/** Перелистывание — мягче, без дребезга (как SHIFT ленты). */
const SLIDE = { stiffness: 280, damping: 32 }
/** Порог накопленной wheel-делты до перелистывания. */
const WHEEL_THRESHOLD = 60
/** Пауза после перелистывания — гасит хвост инерции трекпада. */
const WHEEL_COOLDOWN_MS = 550

/** Метрики вьюпорта: размеры + нужные токены в px (пересчёт при ресайзе/смене тира). */
interface StageMetrics {
  w: number
  h: number
  gap: number
  edgeX: number
}

/** Число ступеней псевдо-прогрессивного блюра. */
const BLUR_STEPS = 6
/** Радиус блюра: у кромки, обращённой к центру, → у края экрана. */
const BLUR_MIN = 2
const BLUR_MAX = 16

interface BlurSlicesProps {
  image: ImageDetail
  /** Ширина слайда, px. */
  width: number
  /** Видимая часть слайда (от кромки, обращённой к центру, до края экрана), px. */
  visible: number
  /** Сосед слева от центра: рост блюра к ЛЕВОМУ краю экрана. */
  mirror: boolean
}

/**
 * Ступенчатый градиентный блюр соседнего слайда: N срезов блюр-копии картинки с растущими
 * к краю экрана радиусом и плотностью. Ступени распределены по ВИДИМОЙ части слайда
 * (от кромки, обращённой к центру, до края экрана) — так прогрессия доходит до максимума
 * ровно у края экрана и у широких соседей; заэкранный остаток накрыт хвостом полного блюра.
 */
function BlurSlices({ image, width, visible, mirror }: BlurSlicesProps) {
  const span = Math.min(Math.max(visible, 1), width)
  const step = span / BLUR_STEPS
  const slices = Array.from({ length: BLUR_STEPS + 1 }, (_, k) => {
    const tail = k === BLUR_STEPS
    // Доля пути от кромки, обращённой к центру (0 — резко), к краю экрана (1 — максимум).
    const t = tail ? 1 : (k + 0.5) / BLUR_STEPS
    // Начало среза от внутренней кромки; зеркалим для соседа слева (кромка справа).
    const from = tail ? span : k * step
    const sliceW = tail ? Math.max(width - span, 0) : step
    const left = mirror ? width - from - sliceW : from
    return { k, t, left, sliceW }
  })
  return (
    <>
      {slices.map(({ k, t, left, sliceW }) =>
        sliceW <= 0 ? null : (
          <span
            key={k}
            className={styles.blurSlice}
            style={{ left: `${left}px`, width: `${sliceW}px`, opacity: 0.15 + 0.85 * t }}
          >
            <picture
              className={styles.blurPic}
              style={{
                width: `${width}px`,
                transform: `translateX(${-left}px)`,
                filter: `blur(${BLUR_MIN + (BLUR_MAX - BLUR_MIN) * t}px)`,
              }}
            >
              <source type="image/avif" srcSet={image.variants.full.avif} />
              <source type="image/webp" srcSet={image.variants.full.webp} />
              <img src={image.variants.full.jpg} alt="" loading="lazy" />
            </picture>
          </span>
        ),
      )}
    </>
  )
}

interface WorkCarouselProps {
  images: ImageDetail[]
  title: string | null
  description: string | null
  /** Снимок тайла листинга: фон-плейсхолдер первой картинки (+ старт FLIP при flipOk). */
  source: FlipSource | null
  /** Анимировать открытие полётом из тайла (false — данные пришли поздно, просто fade). */
  flipOk: boolean
  /** Контейнер role=dialog — фокус-трап и fallback-анимация закрытия WorkModal. */
  dialogRef: MutableRefObject<HTMLDivElement | null>
  /** Текущий центральный слайд — цель обратного полёта при закрытии (firstRef WorkModal). */
  centralRef: MutableRefObject<HTMLDivElement | null>
  /** Индекс центрального слайда — WorkModal летит в тайл только с первого слайда. */
  indexRef: MutableRefObject<number>
  onClose: () => void
}

export function WorkCarousel({
  images,
  title,
  description,
  source,
  flipOk,
  dialogRef,
  centralRef,
  indexRef,
  onClose,
}: WorkCarouselProps) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const slideEls = useRef<(HTMLDivElement | null)[]>([])
  const [index, setIndex] = useState(0)
  const [stage, setStage] = useState<StageMetrics | null>(null)
  indexRef.current = index

  const count = images.length
  const step = (dir: number): void =>
    setIndex((i) => Math.max(0, Math.min(count - 1, i + dir)))
  // Актуальный step для подписок с пустыми deps (wheel/клавиатура).
  const stepRef = useRef(step)
  stepRef.current = step

  // ── Метрики вьюпорта: layout-эффект (до пейнта) + ResizeObserver на живые ресайзы.
  useLayoutEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const measure = (): void => {
      const cs = getComputedStyle(el)
      setStage({
        w: el.clientWidth,
        h: el.clientHeight,
        gap: parseFloat(cs.getPropertyValue('--tile-gap')) || 0,
        edgeX: parseFloat(cs.getPropertyValue('--modal-edge-x')) || 0,
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Геометрия слайдов: все одной высоты (= вьюпорт), ширина по аспекту с капом
  // по полям edge-x (сверх-широкая картинка ужимается и летербоксится по центру).
  const widths = stage
    ? images.map((img) => Math.min((img.w / img.h) * stage.h, stage.w - 2 * stage.edgeX))
    : []
  // Центры слайдов нарастающим итогом: c[i] = c[i−1] + w[i−1]/2 + gap + w[i]/2.
  const centers: number[] = []
  for (let i = 0; i < widths.length; i++) {
    centers.push(
      i === 0 ? 0 : (centers[i - 1] ?? 0) + ((widths[i - 1] ?? 0) + (widths[i] ?? 0)) / 2 + (stage?.gap ?? 0),
    )
  }
  const offsetOf = (i: number): number => (centers[i] ?? 0) - (centers[index] ?? 0)

  // ── Перелистывание — WAAPI-спринг (lib/spring), НЕ CSS-transition на transform:
  // постоянно промоутнутый transition-слой не перерастеризуется, когда картинка внутри
  // догружается и проявляется (opacity 0→1 у WorkImage) — слайд оставался невидимым
  // до любой инвалидации. Спринг промоутит слой только на время полёта и снимается
  // cancel'ом — финальный кадр растеризуется заново. Делта у всех слайдов одна.
  const prevCenterRef = useRef<number | null>(null)
  useLayoutEffect(() => {
    const prev = prevCenterRef.current
    const cur = centers[index] ?? 0
    prevCenterRef.current = cur
    if (prev === null || prev === cur || prefersReducedMotion()) return
    for (const el of slideEls.current) {
      if (el) springTo(el, { x: cur - prev, y: 0 }, { spring: SLIDE })
    }
    // centers пересчитываются и от ресайза — но там prev/cur совпадают, спринга нет.
    // eslint-нет — эффект намеренно завязан только на смену индекса.
  }, [index, centers[index]])

  // ── Колесо/трекпад: вертикальную дельту читаем как горизонтальную; порог + кулдаун
  // гасят инерцию, смена направления сбрасывает накопление. passive: false — жест
  // целиком принадлежит карусели (страница под модалкой и так заблокирована).
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    let acc = 0
    let lockUntil = 0
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault()
      const now = performance.now()
      if (now < lockUntil) return
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (d === 0) return
      if (Math.sign(d) !== Math.sign(acc)) acc = 0
      acc += d
      if (Math.abs(acc) >= WHEEL_THRESHOLD) {
        stepRef.current(acc > 0 ? 1 : -1)
        acc = 0
        lockUntil = now + WHEEL_COOLDOWN_MS
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ── Клавиши ←/→ (Esc закрывает в useWorkModal).
  useEffect(() => {
    const onKeydown = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        stepRef.current(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        stepRef.current(-1)
      }
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [])

  // ── Открытие: FLIP центрального слайда из тайла + fade оснастки; без источника
  // (deep-link / поздние данные) — fade сцены целиком. Гард — от двойного маунта StrictMode.
  const enteredRef = useRef(false)
  useLayoutEffect(() => {
    if (!stage || enteredRef.current) return
    enteredRef.current = true
    if (prefersReducedMotion()) return
    const central = centralRef.current
    const from = flipOk ? source?.rect : undefined
    if (central && from && from.width > 0 && from.height > 0) {
      const to = central.getBoundingClientRect()
      if (to.width > 0 && to.height > 0) {
        springTo(
          central,
          {
            x: from.left - to.left,
            y: from.top - to.top,
            sx: from.width / to.width,
            sy: from.height / to.height,
          },
          { spring: FLY },
        )
        const aux = stageRef.current?.querySelectorAll<HTMLElement>('[data-caraux], [data-carslide]')
        for (const el of Array.from(aux ?? [])) {
          if (el !== central) fade(el, 'in', { duration: 220, delay: 160 })
        }
        return
      }
    }
    if (stageRef.current) fade(stageRef.current, 'in', { duration: 240 })
    // eslint-нет — по факту эффект однократный (enteredRef), deps только будят его.
  }, [stage])

  const hasMeta = Boolean(title || description)
  const canPrev = index > 0
  const canNext = index < count - 1

  // Блюр-зоны: от кромки центрального слайда (+ ползазора) до края экрана.
  const stripW = stage ? Math.max(0, (stage.w - (widths[index] ?? 0)) / 2 - stage.gap / 2) : 0
  // Стрелка — по центру блюр-зоны, но не ближе 16px к краю.
  const navInset = Math.max(16, stripW / 2 - 22)

  // Клик по свободному полю (не по слайду/мете/кнопкам) закрывает.
  const onFree = (e: MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      ref={(el) => {
        stageRef.current = el
        dialogRef.current = el
      }}
      className={styles.stage}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Работа'}
      tabIndex={-1}
      onClick={onFree}
      data-test="work-dialog"
      data-carousel=""
    >
      <div ref={viewportRef} className={styles.viewport} onClick={onFree} data-test="carousel-viewport">
        {stage &&
          images.map((img, i) => {
            const central = i === index
            return (
              <div
                key={img.id}
                ref={(el) => {
                  slideEls.current[i] = el
                  if (el && central) centralRef.current = el
                }}
                className={central ? styles.slide : `${styles.slide} ${styles.slideSide}`}
                // Центрирование марджинами: высота слайда выводится из ширины и аспекта.
                style={{
                  width: `${widths[i] ?? 0}px`,
                  marginLeft: `${-(widths[i] ?? 0) / 2}px`,
                  marginTop: `${-(widths[i] ?? 0) / (img.w / img.h) / 2}px`,
                  transform: `translateX(${offsetOf(i)}px)`,
                }}
                onClick={central ? undefined : () => setIndex(i)}
                data-carslide={i}
                data-test={central ? 'carousel-central' : 'carousel-side'}
              >
                <WorkImage
                  image={img}
                  className={modalStyles.picture}
                  imgClassName={modalStyles.img}
                  placeholderSrc={i === 0 ? source?.src : undefined}
                  lazy={Math.abs(i - index) > 1}
                />
                {/* Градиентный блюр соседа (ступени BlurSlices); у центрального слайда
                    оверлей плавно гаснет (opacity). */}
                <span
                  className={central ? `${styles.blurCover} ${styles.blurCoverOff}` : styles.blurCover}
                  aria-hidden="true"
                >
                  <BlurSlices
                    image={img}
                    width={widths[i] ?? 0}
                    // Видимая часть: от кромки слайда, обращённой к центру, до края экрана.
                    visible={
                      stage
                        ? i < index
                          ? stage.w / 2 + offsetOf(i) + (widths[i] ?? 0) / 2
                          : stage.w / 2 - offsetOf(i) + (widths[i] ?? 0) / 2
                        : widths[i] ?? 0
                    }
                    mirror={i < index}
                  />
                </span>
              </div>
            )
          })}

        {canPrev && (
          <button
            type="button"
            className={`${styles.nav} ${styles.navPrev}`}
            style={{ left: `${navInset}px` }}
            onClick={() => stepRef.current(-1)}
            aria-label="Предыдущая картинка"
            data-caraux=""
            data-test="carousel-prev"
          >
            <span className={styles.chevron} aria-hidden="true" />
          </button>
        )}
        {canNext && (
          <button
            type="button"
            className={`${styles.nav} ${styles.navNext}`}
            style={{ right: `${navInset}px` }}
            onClick={() => stepRef.current(1)}
            aria-label="Следующая картинка"
            data-caraux=""
            data-test="carousel-next"
          >
            <span className={styles.chevron} aria-hidden="true" />
          </button>
        )}
      </div>

      {hasMeta && (
        <div className={`${modalStyles.meta} ${styles.metaBox}`} data-caraux="" data-test="work-meta">
          {title && (
            <h2 className={modalStyles.title} data-test="work-title">
              {title}
            </h2>
          )}
          {title && description && <div className={modalStyles.divider} aria-hidden="true" />}
          {description && (
            <p className={modalStyles.description} data-test="work-description">
              {description}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        className={`${modalStyles.close} ${styles.closeBtn}`}
        onClick={onClose}
        aria-label="Закрыть"
        data-caraux=""
        data-test="work-close"
      >
        <span className={modalStyles.closeGlyph} aria-hidden="true" />
      </button>
    </div>
  )
}
