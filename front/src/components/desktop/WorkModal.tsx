// Полноэкранная модалка работы — десктоп (задача 10, спека §8). Рендерится ПОВЕРХ листинга
// (роут /projects/:cat/:sub/:work в App.tsx). Описание + карусель (`<picture>` avif/webp/jpg,
// LQIP-фон), стрелки/клавиатура/Esc/клик по фону, фокус-трэп, блокировка скролла фона.
// Вся логика — в useWorkModal (общий с мобайлом); здесь только десктоп-разметка.

import { useRef, type MouseEvent } from 'react'
import { useWorkModal } from '../../hooks/useWorkModal'
import { useScrollLock } from '../../hooks/useScrollLock'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { PreloadImage, WorkImage } from '../WorkImage'
import styles from './WorkModal.module.css'

export function WorkModal() {
  const dialogRef = useRef<HTMLDivElement>(null)
  const modal = useWorkModal()
  useScrollLock(true)
  useFocusTrap(dialogRef, modal.status !== 'notfound')

  // 404 → useWorkModal редиректит на листинг; модалку не рисуем (нет белого экрана).
  if (modal.status === 'notfound') return null

  const title = modal.detail?.title ?? 'Работа'

  // Соседние слайды греем заранее скрытыми <picture> — листание без ожидания сети.
  // При двух картинках prev === next, второго прелоадера не нужно.
  const nextImage =
    modal.count > 1 ? modal.images[(modal.activeIndex + 1) % modal.count] : undefined
  const prevImage =
    modal.count > 2 ? modal.images[(modal.activeIndex - 1 + modal.count) % modal.count] : undefined

  // Фон = клик по самому оверлею (рамка-паддинг) ИЛИ по пустому полю сцены вокруг картинки.
  const onBackdrop = (e: MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) modal.close()
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
        <button
          type="button"
          className={styles.close}
          onClick={modal.close}
          aria-label="Закрыть"
          data-test="work-close"
        >
          <span className={styles.closeGlyph} aria-hidden="true" />
        </button>

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
          <div className={styles.body}>
            <div className={styles.stage} onClick={onBackdrop} data-test="work-stage">
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
                  <span className={styles.counter} data-test="work-counter">
                    {modal.activeIndex + 1} / {modal.count}
                  </span>
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
