import { describe, expect, it } from 'vitest'

import { loginSchema } from './validation'

describe('loginSchema', () => {
  it('пропускает непустой пароль', () => {
    const result = loginSchema.safeParse({ password: 'hunter2' })
    expect(result.success).toBe(true)
  })

  it('отклоняет пустой пароль с русским сообщением', () => {
    const result = loginSchema.safeParse({ password: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Введите пароль')
    }
  })

  it('отклоняет отсутствующее поле password', () => {
    const result = loginSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
