// Блокировка скролла документа на время показа модалки (задача 10). Сохраняет и
// восстанавливает прежнее значение `overflow`, поэтому не конфликтует с занавесом-героем
// (App.tsx тоже управляет `documentElement.overflow`, но при открытой модалке герой уже
// в фазе 'gone' и свой эффект не перезапускает).

import { useEffect } from 'react'

export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const el = document.documentElement
    const prev = el.style.overflow
    el.style.overflow = 'hidden'
    return () => {
      el.style.overflow = prev
    }
  }, [active])
}
