// Полноэкранная модалка работы — мобайл (задача 10, спека §8). То же поведение, что и на
// десктопе (общий контроллер useWorkModal), мобильная разметка: верхняя панель (закрыть +
// счётчик), карусель со свайпом и тап-стрелками, прокручиваемое описание. Скролл фона
// заблокирован; внутренняя мета-область скроллится сама.

import { useRef, type MouseEvent, type TouchEvent } from 'react'
import { useWorkModal } from '../../hooks/useWorkModal'
import { useScrollLock } from '../../hooks/useScrollLock'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { PreloadImage, WorkImage } from '../WorkImage'
import styles from './MobileWorkModal.module.css'

/** Минимальный сдвиг (px) горизонтального свайпа для смены слайда. */
const SWIPE_THRESHOLD = 40

export function MobileWorkModal() {
  const dialogRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const modal = useWorkModal()
  useScrollLock(true)
  useFocusTrap(dialogRef, modal.status !== 'notfound')

  if (modal.status === 'notfound') return null

  const title = modal.detail?.title ?? 'Работа'

  // Соседние слайды греем заранее скрытыми <picture> — свайп без ожидания сети.
  // При двух картинках prev === next, второго прелоадера не нужно.
  const nextImage =
    modal.count > 1 ? modal.images[(modal.activeIndex + 1) % modal.count] : undefined
  const prevImage =
    modal.count > 2 ? modal.images[(modal.activeIndex - 1 + modal.count) % modal.count] : undefined

  const onBackdrop = (e: MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) modal.close()
  }

  const onTouchStart = (e: TouchEvent<HTMLDivElement>): void => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }
  const onTouchEnd = (e: TouchEvent<HTMLDivElement>): void => {
    const start = touchStartX.current
    touchStartX.current = null
    if (start === null || modal.count < 2) return
    const dx = (e.changedTouches[0]?.clientX ?? start) - start
    if (Math.abs(dx) < SWIPE_THRESHOLD) return
    if (dx < 0) modal.next()
    else modal.prev()
  }

  return (
    <div className={styles.overlay} onClick={onBackdrop} data-test="work-modal">
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        data-test="work-dialog"
      >
        <div className={styles.bar}>
          {modal.status === 'ready' && modal.count > 1 ? (
            <span className={styles.counter} data-test="work-counter">
              {modal.activeIndex + 1} / {modal.count}
            </span>
          ) : (
            <span />
          )}
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

        {modal.status === 'loading' && (
          <p className={styles.message} data-test="work-loading">
            Загрузка…
          </p>
        )}

        {modal.status === 'error' && (
          <p className={styles.message} data-test="work-error">
            Не удалось загрузить работу. Закройте окно и попробуйте снова.
          </p>
        )}

        {modal.status === 'ready' && modal.detail && (
          <div className={styles.content} data-test="work-content">
            <div
              className={styles.stage}
              onClick={onBackdrop}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              data-test="work-stage"
            >
              {modal.activeImage && (
                <WorkImage
                  key={modal.activeImage.id}
                  image={modal.activeImage}
                  className={styles.picture}
                  imgClassName={styles.img}
                />
              )}
              {nextImage && <PreloadImage key={`pre-${nextImage.id}`} image={nextImage} />}
              {prevImage && <PreloadImage key={`pre-${prevImage.id}`} image={prevImage} />}

              {modal.count > 1 && (
                <>
                  <button
                    type="button"
                    className={`${styles.nav} ${styles.navPrev}`}
                    onClick={modal.prev}
                    aria-label="Предыдущая картинка"
                    data-test="work-prev"
                  >
                    <span className={styles.chevron} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={`${styles.nav} ${styles.navNext}`}
                    onClick={modal.next}
                    aria-label="Следующая картинка"
                    data-test="work-next"
                  >
                    <span className={styles.chevron} aria-hidden="true" />
                  </button>
                </>
              )}
            </div>

            <div className={styles.meta} data-test="work-meta">
              <h2 className={styles.title} data-test="work-title">
                {title}
              </h2>
              {modal.detail.description && (
                <p className={styles.description} data-test="work-description">
                  {modal.detail.description}
                </p>
              )}
              {modal.activeImage?.alt && (
                <p className={styles.caption} data-test="work-caption">
                  {modal.activeImage.alt}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
