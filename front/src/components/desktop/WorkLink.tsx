// Ссылка на работу с обложкой и hover-«веером» (desktop): общий тайл для masonry-гридов
// (страница категории, тег-режим корневой) и слотов витрин `/projects`.
//
// Веер — только у работ с 2+ картинками (`tile.peek` из API непустой): по ховеру тайл растёт
// до --tile-hover-scale, затем стопка раздвигается — обложка уезжает вправо с поворотом
// (она справа и СВЕРХУ), 2-я картинка остаётся в центре, 3-я уходит влево и лежит сзади
// (решение заказчика, 2026-09-08). Уход курсора — строго обратный порядок. Хореография —
// целиком CSS-transitions в WorkLink.module.css, JS лишь размечает `data-fan="1|2"`.
//
// Peek-карточки монтируются ПОСЛЕ загрузки обложки (`onLoaded`) и грузятся lazy: LCP-обложки
// не конкурируют с превью, а thumb'ы веера подтягиваются в фоне сразу за ними. На тач-экранах
// и при prefers-reduced-motion веер выключен целиком (ни разметки, ни сети) — тайл ведёт себя
// как обычная ссылка с прежним ховером экрана.
//
// Порядок детей важен: обложка — ПЕРВАЯ <img> внутри ссылки, её берёт FLIP-снимок модалки
// (lib/flip.ts) и обратный полёт при закрытии.

import { useCallback, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { Tile } from '../../api/types'
import { workHref } from '../../lib/links'
import { TileImage } from '../TileImage'
import styles from './WorkLink.module.css'

/** Веер имеет смысл только с настоящим hover и без запрета анимаций (то же условие в CSS). */
const FAN_MEDIA = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'
const FAN_ENABLED = typeof window !== 'undefined' && window.matchMedia(FAN_MEDIA).matches

/** Сколько peek-карточек показывает веер (API отдаёт не больше). */
const FAN_PEEKS = 2

interface WorkLinkProps {
  work: Tile
  /** Класс экрана на ссылке (`.tile` masonry / `.slot` витрины — раскладка и обычный ховер). */
  className: string
  /** Слот витрины: inline `aspectRatio` + `--ar` (единственное разрешённое инлайн-исключение). */
  style?: CSSProperties
  /** LCP: eager-загрузка обложки. */
  eager?: boolean
  /** Обложка заполняет бокс ссылки (слот витрины); иначе — натуральная высота по aspect-ratio (masonry). */
  fill?: boolean
  /** Выключить веер (превью в карточках `cards`: рамка с overflow hidden его порвала бы). */
  fan?: boolean
  'data-test': string
  /** Оверлеи поверх стопки (пилюля-подпись hero-слота). */
  children?: ReactNode
}

export function WorkLink({
  work,
  className,
  style,
  eager = false,
  fill = false,
  fan = true,
  'data-test': dataTest,
  children,
}: WorkLinkProps) {
  const [peeksReady, setPeeksReady] = useState(false)
  const onCoverLoaded = useCallback(() => setPeeksReady(true), [])

  const peeks = fan && FAN_ENABLED ? work.peek.slice(0, FAN_PEEKS) : []
  const fanOn = peeks.length > 0

  return (
    <Link
      to={workHref(work)}
      className={`${styles.host} ${className}`}
      {...(style ? { style } : {})}
      aria-label={work.title ?? 'Открыть работу'}
      data-test={dataTest}
      {...(fanOn ? { 'data-fan': String(peeks.length) } : {})}
    >
      <TileImage
        variants={work.variants}
        className={fill ? `${styles.cover} ${styles.coverFill}` : styles.cover}
        imgClassName={fill ? styles.coverImgFill : styles.coverImg}
        {...(fill ? {} : { aspectRatio: `${work.w} / ${work.h}` })}
        eager={eager}
        {...(fanOn ? { onLoaded: onCoverLoaded } : {})}
      />
      {fanOn &&
        peeksReady &&
        peeks.map((p, i) => (
          <span key={i} className={styles.peek} aria-hidden="true" data-test="work-peek">
            <TileImage variants={p.variants} className={styles.peekPicture} imgClassName={styles.peekImg} />
          </span>
        ))}
      {children}
    </Link>
  )
}
