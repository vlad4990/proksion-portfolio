// Фокус-трэп модалки (задача 10, доступность). Пока активен: ставит фокус внутрь контейнера,
// зацикливает Tab/Shift+Tab по фокусируемым элементам и возвращает фокус на прежний элемент
// при размонтировании. Esc обрабатывается отдельно (useWorkModal) — здесь только цикл Tab.

import { useEffect, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active) return
    const node = ref.current
    if (!node) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const visibleFocusables = (): HTMLElement[] =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )

    // Стартовый фокус — первый фокусируемый, иначе сам контейнер (tabIndex=-1).
    ;(visibleFocusables()[0] ?? node).focus()

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const items = visibleFocusables()
      if (items.length === 0) {
        e.preventDefault()
        node.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const current = document.activeElement
      if (e.shiftKey) {
        if (current === first || !node.contains(current)) {
          e.preventDefault()
          last.focus()
        }
      } else if (current === last || !node.contains(current)) {
        e.preventDefault()
        first.focus()
      }
    }

    node.addEventListener('keydown', onKeydown)
    return () => {
      node.removeEventListener('keydown', onKeydown)
      previouslyFocused?.focus?.()
    }
  }, [ref, active])
}
