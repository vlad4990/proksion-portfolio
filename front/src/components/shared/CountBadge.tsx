// Бейдж счётчика работ (спека редизайна §6): «1 РАБОТА» / «2 РАБОТЫ» / «68 РАБОТ».
// Общий атом обоих деревьев; мобильный вариант — те же элементы, плотнее и мельче.
// Плюрализация — formatWorksCount из src/lib/format.ts.

import { formatWorksCount } from '../../lib/format'
import styles from './CountBadge.module.css'

export interface CountBadgeProps {
  count: number
  /** Мобильное дерево — компактные размеры бейджа. */
  mobile?: boolean
  /** `data-test` для визуальных/e2e-проверок. */
  testId?: string
}

export function CountBadge({ count, mobile = false, testId = 'count-badge' }: CountBadgeProps) {
  return (
    <span
      className={`${styles.badge}${mobile ? ` ${styles.badgeMobile}` : ''}`}
      data-test={testId}
    >
      {formatWorksCount(count)}
    </span>
  )
}
