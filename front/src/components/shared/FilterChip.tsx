// Чип-фильтр (спека редизайна §6): теги корневой /projects и табы подкатегорий страницы
// категории. Общий атом для ОБОИХ деревьев — визуальных развилок в нём нет, мобильный
// вариант отличается только размерами (проп `mobile` → класс с --*-mob токенами).
//
// Полиморфный: с `to` — настоящая ссылка (<Link>), потому что фильтр живёт в URL
// (cmd-клик/копирование адреса работают); с `onClick` — кнопка (локальное состояние).

import { Link } from 'react-router'
import styles from './FilterChip.module.css'

interface FilterChipBase {
  /** Подпись чипа — приходит уже в верхнем регистре (display-конвенция). */
  label: string
  /** Счётчик работ справа от подписи; `undefined` — чип без счётчика. */
  count?: number | undefined
  active?: boolean
  /** Мобильное дерево — компактные размеры чипа. */
  mobile?: boolean
  /** `data-test` для визуальных/e2e-проверок. */
  testId?: string
}

/** Либо ссылка (`to`), либо кнопка (`onClick`) — но не оба сразу. */
export type FilterChipProps = FilterChipBase &
  ({ to: string; onClick?: never } | { onClick: () => void; to?: never })

export function FilterChip(props: FilterChipProps) {
  const { label, count, active = false, mobile = false, testId } = props

  const className = [
    styles.chip,
    mobile ? styles.chipMobile : '',
    active ? styles.chipActive : '',
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      <span className={styles.label}>{label}</span>
      {count !== undefined && <span className={styles.count}>{count}</span>}
    </>
  )

  if (props.to !== undefined) {
    return (
      <Link
        className={className}
        to={props.to}
        aria-current={active ? 'page' : undefined}
        data-test={testId}
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      type="button"
      className={className}
      onClick={props.onClick}
      aria-pressed={active}
      data-test={testId}
    >
      {content}
    </button>
  )
}
