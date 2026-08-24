// Модалка работы — десктоп. НЕ фулскрин: затемнение (--backdrop) + центрированный
// ПРОЗРАЧНЫЙ контейнер. Картинки работы — вертикальная лента (flex-col, gap токеном),
// без карусели; мета (тайтл/описание) — справа при нескольких картинках (flex-row),
// снизу при одной (flex-col). Размер задаёт ПЕРВАЯ картинка: высота ≤ 100dvh − 2·edge-y,
// ширина ≤ 100vw − 2·edge-x (аспект строгий — формула в .images CSS).
// Скролл — по overlay: лента уходит за верхнюю границу окна.
//
// Анимация открытия (lib/spring — рукописные WAAPI-спринги, без библиотек):
//   1) FLIP: thumb тайла листинга (lib/flip) «летит» в финальное место первой картинки;
//   2) с микрозадержкой мета выезжает из-под картинки, колонка картинок сдвигается
//      в противоположную сторону (transform компенсирует смещение центра — данные могли
//      прийти и ПОСЛЕ старта FLIP, тогда компенсация меряется по фактическому скачку);
//   3) доп. картинки вылетают вниз из-под первой (stagger, убывающий z-index);
//   4) параллельно затемняется фон и проявляется крестик.
// Закрытие — обратный полёт первой картинки в тайл (если он в кадре), иначе угасание.
// Всё на WAAPI поверх ref'ов: ноль ререндеров React в кадре анимации.

import { useLayoutEffect, useRef, type CSSProperties, type MouseEvent } from 'react'
import { useWorkModal } from '../../hooks/useWorkModal'
import { useScrollLock } from '../../hooks/useScrollLock'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { findLiveTile, getFlipSource, type FlipSource } from '../../lib/flip'
import { fade, prefersReducedMotion, springFrom, springTo, whenDone } from '../../lib/spring'
import { WorkImage } from '../WorkImage'
import styles from './WorkModal.module.css'

/** Полёт картинки из/в тайл — лёгкий overshoot (iOS-инерция). */
const FLY = { stiffness: 300, damping: 30 }
/** Выезд меты и сдвиг колонки — мягче, без дребезга. */
const SHIFT = { stiffness: 280, damping: 32 }
/** Закрытие — плотнее, без перелёта за тайл. */
const RETURN = { stiffness: 340, damping: 36 }
/** Стартовое смещение меты (выезд из-под картинки) и доп. картинок (вылет вниз). */
const META_SLIDE = 120
const REST_FLY = 120

export function WorkModal() {
  const rootRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const imagesRef = useRef<HTMLDivElement>(null)
  const firstRef = useRef<HTMLDivElement>(null)
  const metaRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  // FLIP-источник берём один раз на жизнь модалки (клик мог быть по легаси-id — после
  // replace-канонизации URL источник уже не заматчится, поэтому фиксируем при монтировании).
  const sourceRef = useRef<FlipSource | null | undefined>(undefined)
  // Был ли контент готов уже при монтировании (кэш) и позиция диалога на старте —
  // для компенсации скачка центра, когда мета/доп. картинки монтируются позже.
  const mountReadyRef = useRef(false)
  const mountPosRef = useRef<{ left: number; top: number } | null>(null)

  /** Доп. картинки ленты — все дети колонки после первой. */
  const restEls = (): HTMLElement[] =>
    Array.from(imagesRef.current?.children ?? [])
      .slice(1)
      .filter((n): n is HTMLElement => n instanceof HTMLElement)

  // Анимация закрытия: обратный полёт первой картинки в тайл (если и тайл, и картинка
  // в кадре), мета уезжает под неё, остальное гаснет; иначе — угасание диалога целиком.
  // ВАЖНО: pointer-events НЕ отключаем — root продолжает перехватывать клики до самого
  // размонтирования (иначе сквозь гаснущий фон можно кликнуть листинг и увести историю
  // из-под отложенного navigate(-1)); повторные close() гасит гард в useWorkModal.
  const runClose = (finish: () => void): void => {
    if (prefersReducedMotion()) {
      finish()
      return
    }
    const anims: Animation[] = []
    if (backdropRef.current) anims.push(fade(backdropRef.current, 'out', { duration: 240 }))
    if (closeBtnRef.current) anims.push(fade(closeBtnRef.current, 'out', { duration: 150 }))
    const first = firstRef.current
    const src = sourceRef.current
    // Живой тайл ищем заново по канонической ссылке: узел из снимка к закрытию
    // почти наверняка пересоздан реконсиляцией листинга под модалкой.
    const liveTile = src ? findLiveTile(src.path) : null
    const tile = liveTile?.getBoundingClientRect() ?? null
    const cur = first?.getBoundingClientRect() ?? null
    const tileInView = !!tile && tile.width > 0 && tile.bottom > 0 && tile.top < window.innerHeight
    const curInView = !!cur && cur.bottom > 0 && cur.top < window.innerHeight
    if (first && cur && tile && tileInView && curInView) {
      anims.push(
        springFrom(
          first,
          {
            x: tile.left - cur.left,
            y: tile.top - cur.top,
            sx: tile.width / cur.width,
            sy: tile.height / cur.height,
          },
          { spring: RETURN },
        ),
      )
      if (metaRef.current) {
        const row = restEls().length > 0
        anims.push(
          springFrom(metaRef.current, row ? { x: -META_SLIDE, y: 0 } : { x: 0, y: -META_SLIDE }, {
            spring: RETURN,
            fade: 'out',
          }),
        )
      }
      for (const el of restEls()) anims.push(fade(el, 'out', { duration: 150 }))
    } else if (dialogRef.current) {
      anims.push(
        springFrom(dialogRef.current, { x: 0, y: 12, sx: 0.98, sy: 0.98 }, {
          spring: RETURN,
          fade: 'out',
          origin: '50% 50%',
        }),
      )
    }
    void whenDone(anims).then(finish)
  }

  const modal = useWorkModal(runClose)
  if (sourceRef.current === undefined) sourceRef.current = getFlipSource(modal.work)
  const source = sourceRef.current

  useScrollLock(true)
  useFocusTrap(dialogRef, modal.status !== 'notfound')

  // ── Открытие, часть 1 (mount): затемнение, крестик, FLIP первой картинки из тайла.
  // useLayoutEffect — замеры и старт до первого пейнта, никакого мигания финальным кадром.
  // openedRef — гард от двойного маунта StrictMode: повторный запуск замерил бы rect
  // с УЖЕ применённым первым кадром FLIP (fill: both) и заместил бы полёт вырожденной
  // анимацией; ref переживает симуляцию remount, DOM и первая анимация — живы.
  const openedRef = useRef(false)
  useLayoutEffect(() => {
    if (openedRef.current) return
    openedRef.current = true
    mountReadyRef.current = modal.status === 'ready'
    if (dialogRef.current) {
      // offsetLeft/Top — позиция в layout БЕЗ transform'ов (offsetParent = .scroller).
      mountPosRef.current = { left: dialogRef.current.offsetLeft, top: dialogRef.current.offsetTop }
    }
    if (prefersReducedMotion()) return
    if (backdropRef.current) fade(backdropRef.current, 'in', { duration: 260 })
    if (closeBtnRef.current) fade(closeBtnRef.current, 'in', { duration: 220, delay: 160 })
    const first = firstRef.current
    const src = sourceRef.current
    if (first && src) {
      // Старт — СНИМОК геометрии тайла на момент клика (см. lib/flip: живой узел к этому
      // моменту мог быть пересоздан реконсиляцией листинга, но пиксели на экране прежние).
      const from = src.rect
      const to = first.getBoundingClientRect()
      if (to.width > 0 && to.height > 0 && from.width > 0 && from.height > 0) {
        springTo(
          first,
          {
            x: from.left - to.left,
            y: from.top - to.top,
            sx: from.width / to.width,
            sy: from.height / to.height,
          },
          { spring: FLY },
        )
        return
      }
    }
    // Deep-link/forward без источника — мягкое появление диалога по центру
    // (если контент ещё грузится, при готовности его оживит часть 2).
    if (mountReadyRef.current && dialogRef.current) {
      springTo(dialogRef.current, { x: 0, y: 24, sx: 0.97, sy: 0.97 }, { spring: FLY, fade: 'in', origin: '50% 50%' })
    }
    // eslint-нет — зависимости пустые осознанно: строго один раз на монтирование.
  }, [])

  // ── Открытие, часть 2 (данные готовы): мета выезжает из-под картинки, колонка картинок
  // сдвигается в противоположную сторону, доп. картинки вылетают вниз со stagger.
  const revealedRef = useRef(false)
  useLayoutEffect(() => {
    if (modal.status !== 'ready' || revealedRef.current) return
    revealedRef.current = true
    if (prefersReducedMotion()) return
    const dialog = dialogRef.current
    const imagesEl = imagesRef.current
    const metaEl = metaRef.current
    const rest = restEls()

    // Без FLIP-источника отдельные части не оживляем — появляется диалог целиком
    // (если он был готов уже на монтировании, часть 1 это уже сделала).
    if (!sourceRef.current) {
      if (!mountReadyRef.current && dialog) {
        springTo(dialog, { x: 0, y: 24, sx: 0.97, sy: 0.97 }, { spring: FLY, fade: 'in', origin: '50% 50%' })
      }
      return
    }

    if (dialog && imagesEl) {
      const row = rest.length > 0
      const gapPx = parseFloat(getComputedStyle(dialog).columnGap) || 0
      if (mountReadyRef.current) {
        // Всё смонтировалось разом (кэш): стартовый сдвиг колонки — синтетический,
        // «как будто меты ещё нет» (картинка прилетает в центр и уезжает, уступая месте).
        if (metaEl) {
          const m = metaEl.getBoundingClientRect()
          const shift = ((row ? m.width : m.height) + gapPx) / 2
          springTo(imagesEl, row ? { x: shift, y: 0 } : { x: 0, y: shift }, { spring: SHIFT, delay: 100 })
        }
      } else if (mountPosRef.current) {
        // Мета/лента домонтировались ПОСЛЕ старта FLIP: компенсируем фактический скачок
        // центра (по layout-позиции диалога), чтобы движение осталось непрерывным.
        const dx = mountPosRef.current.left - dialog.offsetLeft
        const dy = mountPosRef.current.top - dialog.offsetTop
        if (Math.abs(dx) > 0.5) springTo(imagesEl, { x: dx, y: 0 }, { spring: SHIFT })
        if (Math.abs(dy) > 0.5) springTo(dialog, { x: 0, y: dy }, { spring: SHIFT })
      }
    }
    if (metaEl) {
      const row = rest.length > 0
      springTo(metaEl, row ? { x: -META_SLIDE, y: 0 } : { x: 0, y: -META_SLIDE }, {
        spring: SHIFT,
        delay: 100,
        fade: 'in',
      })
    }
    rest.forEach((el, i) => {
      springTo(el, { x: 0, y: -REST_FLY }, { spring: SHIFT, delay: 180 + Math.min(i, 5) * 50, fade: 'in' })
    })
  }, [modal.status])

  // 404 → useWorkModal редиректит на листинг; модалку не рисуем (нет белого экрана).
  if (modal.status === 'notfound') return null

  const detail = modal.detail
  const images = modal.images
  const first = images[0]
  const rest = images.slice(1)
  const title = detail?.title ?? null
  const description = detail?.description ?? null
  const hasMeta = modal.status === 'ready' && Boolean(title || description)

  // Аспект первой картинки задаёт ширину колонки (формула в CSS): из детали, а пока она
  // грузится — из снимка тайла (аспект тот же — та же картинка).
  const ratio = first ? first.w / first.h : (source?.ar ?? null)
  const dialogStyle = ratio ? ({ '--first-ar': String(ratio) } as CSSProperties) : undefined

  const withSideMeta = hasMeta && rest.length > 0
  const dialogClass = [styles.dialog, rest.length > 0 ? styles.row : styles.col, withSideMeta ? styles.withSideMeta : '']
    .filter(Boolean)
    .join(' ')

  // Фон = клик по свободному полю вокруг диалога.
  const onBackdrop = (e: MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) modal.close()
  }

  return (
    <div ref={rootRef} className={styles.root} data-test="work-modal">
      <div ref={backdropRef} className={styles.backdrop} aria-hidden="true" />
      <div className={styles.scroller}>
        <div className={styles.wrap} onClick={onBackdrop}>
          <div
            ref={dialogRef}
            className={dialogClass}
            style={dialogStyle}
            role="dialog"
            aria-modal="true"
            aria-label={title ?? 'Работа'}
            tabIndex={-1}
            data-test="work-dialog"
          >
            {modal.status === 'error' && (
              <p className={styles.message} data-test="work-error">
                Не удалось загрузить работу. Закройте окно и попробуйте снова.
              </p>
            )}

            {modal.status === 'loading' && !source && (
              <p className={styles.message} data-test="work-loading">
                Загрузка…
              </p>
            )}

            {(modal.status === 'ready' || (modal.status === 'loading' && source)) && (
              <div
                ref={imagesRef}
                className={`${styles.images}${withSideMeta ? ` ${styles.imagesNarrow}` : ''}`}
                data-test="work-images"
              >
                {/* Первая картинка: единый узел на loading и ready — FLIP не прерывается
                    сменой контента. Пока full грузится, фоном виден thumb тайла из кэша. */}
                <div
                  ref={firstRef}
                  className={styles.firstBox}
                  style={
                    !first && ratio
                      ? { aspectRatio: String(ratio), backgroundImage: `url("${source?.src ?? ''}")` }
                      : undefined
                  }
                  data-test="work-first"
                >
                  {first && (
                    <WorkImage
                      key={first.id}
                      image={first}
                      className={styles.picture}
                      imgClassName={styles.img}
                      placeholderSrc={source?.src}
                    />
                  )}
                </div>
                {rest.map((img, i) => (
                  // Убывающий z-index — каждая следующая карточка вылетает ИЗ-ПОД предыдущей.
                  <div key={img.id} className={styles.restBox} style={{ zIndex: rest.length - i }}>
                    <WorkImage image={img} className={styles.picture} imgClassName={styles.img} lazy />
                  </div>
                ))}
              </div>
            )}

            {hasMeta && (
              <div ref={metaRef} className={styles.meta} data-test="work-meta">
                {title && (
                  <h2 className={styles.title} data-test="work-title">
                    {title}
                  </h2>
                )}
                {title && description && <div className={styles.divider} aria-hidden="true" />}
                {description && (
                  <p className={styles.description} data-test="work-description">
                    {description}
                  </p>
                )}
              </div>
            )}

            <button
              ref={closeBtnRef}
              type="button"
              className={styles.close}
              onClick={modal.close}
              aria-label="Закрыть"
              data-test="work-close"
            >
              <span className={styles.closeGlyph} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
