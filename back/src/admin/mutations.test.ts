import { describe, expect, test } from 'bun:test'
import { createMutationHook } from './mutations.ts'

describe('createMutationHook', () => {
  test('onMutation() notifies all subscribers', () => {
    const hook = createMutationHook()
    let a = 0
    let b = 0
    hook.subscribe(() => (a += 1))
    hook.subscribe(() => (b += 1))
    hook.onMutation()
    hook.onMutation()
    expect(a).toBe(2)
    expect(b).toBe(2)
  })

  test('unsubscribe stops further notifications', () => {
    const hook = createMutationHook()
    let n = 0
    const off = hook.subscribe(() => (n += 1))
    hook.onMutation()
    off()
    hook.onMutation()
    expect(n).toBe(1)
  })

  test('no subscribers → onMutation() is a safe no-op', () => {
    const hook = createMutationHook()
    expect(() => hook.onMutation()).not.toThrow()
  })

  test('onMutation reference works when detached from the hook object', () => {
    const hook = createMutationHook()
    let n = 0
    hook.subscribe(() => (n += 1))
    const detached = hook.onMutation
    detached()
    expect(n).toBe(1)
  })
})
