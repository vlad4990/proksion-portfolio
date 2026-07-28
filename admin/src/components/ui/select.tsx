import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Нативный `<select>` в стиле Input. Радиксовый Select не заводим: выбор из трёх фиксированных
 * значений не стоит новой зависимости (см. «Don't» в CLAUDE.md), а нативный элемент даёт
 * доступность и клавиатуру бесплатно.
 */
const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<'select'>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
)
Select.displayName = 'Select'

export { Select }
