// Бейдж счётчика работ (спека редизайна §6): «1 РАБОТА» / «2 РАБОТЫ» / «68 РАБОТ».
// Общий атом обоих деревьев; вся визуальная часть — в Badge, здесь только плюрализация
// (formatWorksCount из src/lib/format.ts).

import { formatWorksCount } from '../../lib/format'
import { Badge } from './Badge'

export interface CountBadgeProps {
  count: number
  /** Мобильное дерево — компактные размеры бейджа. */
  mobile?: boolean
  /** `data-test` для визуальных/e2e-проверок. */
  testId?: string
}

export function CountBadge({ count, mobile = false, testId = 'count-badge' }: CountBadgeProps) {
  return (
    <Badge mobile={mobile} testId={testId}>
      {formatWorksCount(count)}
    </Badge>
  )
}
