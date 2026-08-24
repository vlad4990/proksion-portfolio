// Модалка работы — мобайл. Фулскрин (как и была), но вместо карусели — вертикальная
// лента картинок (flex-col, gap токеном); тайтл и описание — внизу под лентой (серый
// блок с чертой, как на десктопе). Открытие — spring-слайд снизу вверх (iOS-шторка),
// закрытие — слайд вниз; всё на WAAPI поверх ref'ов, без ререндеров React в кадре.

import { useLayoutEffect, useRef } from 'react'
import { useWorkModal } from '../../hooks/useWorkModal'
import { useScrollLock } from '../../hooks/useScrollLock'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { getFlipSource, type FlipSource } from '../../lib/flip'
import { prefersReducedMotion, springTo, whenDone } from '../../lib/spring'
import { WorkImage } from '../WorkImage'
import styles from './MobileWorkModal.module.css'

/** Шторка: критически задемпфированный спринг — плавный доезд без дребезга. */
const SHEET = { stiffness: 260, damping: 32 }

export function MobileWorkModal() {
  const overlayRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  // Источник клика (lib/flip) — на мобилке без FLIP, но thumb тайла из кэша идёт
  // фоном первой картинки: full проявляется поверх без «дыры».
  const sourceRef = useRef<FlipSource | null | undefined>(undefined)

  // Закрытие: слайд вниз, затем навигация назад. Клики на время анимации продолжает
  // перехватывать статичный .root (сквозь уехавшую шторку листинг не кликается).
  const runClose = (finish: () => void): void => {
    const overlay = overlayRef.current
    if (!overlay || prefersReducedMotion()) {
      finish()
      return
    }
    const anim = overlay.animate(
      [{ transform: 'translateY(0)' }, { transform: `translateY(100%)` }],
      { duration: 260, easing: 'cubic-bezier(.4, 0, .7, 1)', fill: 'both' },
    )
    void whenDone([anim]).then(finish)
  }

  const modal = useWorkModal(runClose)
  if (sourceRef.current === undefined) sourceRef.current = getFlipSource(modal.work)
  const source = sourceRef.current

  useScrollLock(true)
  useFocusTrap(dialogRef, modal.status !== 'notfound')

  // Открытие: шторка выезжает снизу (до первого пейнта — без мигания финальным кадром).
  // openedRef — гард от двойного маунта StrictMode (не плодим вторую анимацию).
  const openedRef = useRef(false)
  useLayoutEffect(() => {
    const overlay = overlayRef.current
    if (openedRef.current || !overlay || prefersReducedMotion()) return
    openedRef.current = true
    springTo(overlay, { x: 0, y: window.innerHeight }, { spring: SHEET })
  }, [])

  if (modal.status === 'notfound') return null

  const detail = modal.detail
  const images = modal.images
  const title = detail?.title ?? null
  const description = detail?.description ?? null
  const hasMeta = modal.status === 'ready' && Boolean(title || description)

  return (
    <div className={styles.root} data-test="work-modal">
      <div ref={overlayRef} className={styles.sheet}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Работа'}
        tabIndex={-1}
        data-test="work-dialog"
      >
        <div className={styles.bar}>
          <button
            type="button"
            className={styles.close}
            onClick={modal.close}
            aria-label="Закрыть"
            data-test="work-close"
          >
            <span className={styles.closeGlyph} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.content} data-test="work-content">
          {modal.status === 'loading' && !source && (
            <p className={styles.message} data-test="work-loading">
              Загрузка…
            </p>
          )}

          {modal.status === 'error' && (
            <p className={styles.message} data-test="work-error">
              Не удалось загрузить работу. Закройте окно и попробуйте снова.
            </p>
          )}

          {modal.status === 'loading' && source && source.ar !== null && (
            <div
              className={styles.skeleton}
              style={{
                aspectRatio: String(source.ar),
                backgroundImage: `url("${source.src}")`,
              }}
              data-test="work-skeleton"
            />
          )}

          {modal.status === 'ready' && (
            <>
              <div className={styles.images} data-test="work-images">
                {images.map((img, i) => (
                  <WorkImage
                    key={img.id}
                    image={img}
                    className={styles.picture}
                    imgClassName={styles.img}
                    placeholderSrc={i === 0 ? source?.src : undefined}
                    lazy={i > 0}
                  />
                ))}
              </div>

              {hasMeta && (
                <div className={styles.meta} data-test="work-meta">
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
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
