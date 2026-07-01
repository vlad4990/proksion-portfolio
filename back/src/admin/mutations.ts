// Хук «данные изменились» (docs/architecture.md §9): каждая успешная admin-мутация зовёт
// onMutation(), чтобы off-site бэкап (задача 11) мог дебаунсить rclone-push (markDirty()).
//
// Здесь — стабильный, лёгкий эмиттер БЕЗ всякой rclone-логики (её подключит задача 11,
// подписавшись через subscribe()). По умолчанию слушателей нет → onMutation() это безопасный
// no-op. Сам бэкап в этой задаче НЕ реализуется.

export interface MutationHook {
  /** Вызывается на каждой успешной мутации admin-API; синхронно уведомляет всех подписчиков. */
  onMutation(): void
  /** Подписаться на мутации; возвращает функцию отписки. Задача 11 повесит сюда markDirty(). */
  subscribe(listener: () => void): () => void
}

/** Создаёт эмиттер мутаций (set подписчиков). Ошибка в одном слушателе не глушит остальных. */
export function createMutationHook(): MutationHook {
  const listeners = new Set<() => void>()
  return {
    onMutation() {
      for (const listener of listeners) listener()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
