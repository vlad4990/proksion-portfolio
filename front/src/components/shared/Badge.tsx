// Бейдж в hairline-рамке — общий атом обоих деревьев: счётчики работ, срок работы
// в опыте, «2 СТУПЕНИ» и т.п. Разметка одна, платформа переключает класс с --*-mob
// токенами (см. components/shared/README-конвенцию в front/CLAUDE.md).

import type { ReactNode } from 'react'
import styles from './Badge.module.css'

export interface BadgeProps {
  children: ReactNode
  /** Мобильное дерево — компактные размеры бейджа. */
  mobile?: boolean
  /** `data-test` для визуальных/e2e-проверок. */
  testId?: string
}

export function Badge({ children, mobile = false, testId = 'badge' }: BadgeProps) {
  return (
    <span
      className={`${styles.badge}${mobile ? ` ${styles.badgeMobile}` : ''}`}
      data-test={testId}
    >
      {children}
    </span>
  )
}
