import { z } from 'zod'

// Валидация формы логина (одно поле — пароль редактора). Сообщения — русские (конвенция UI).
export const loginSchema = z.object({
  password: z.string().min(1, 'Введите пароль'),
})

export type LoginValues = z.infer<typeof loginSchema>
