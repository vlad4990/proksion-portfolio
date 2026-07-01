import { describe, expect, it } from 'vitest'

import {
  isAllSettled,
  isBusy,
  nextPending,
  overallProgress,
  uploadReducer,
  type UploadItem,
} from './upload-queue'

const enqueue = (...names: string[]): UploadItem[] =>
  uploadReducer([], { type: 'enqueue', items: names.map((n, i) => ({ id: `f${i}`, name: n })) })

describe('uploadReducer', () => {
  it('enqueue добавляет элементы в статусе idle с progress 0', () => {
    const state = enqueue('a.png', 'b.png')
    expect(state).toHaveLength(2)
    expect(state.every((i) => i.status === 'idle' && i.progress === 0)).toBe(true)
  })

  it('start: idle → uploading', () => {
    let state = enqueue('a.png')
    state = uploadReducer(state, { type: 'start', id: 'f0' })
    expect(state[0]!.status).toBe('uploading')
  })

  it('progress обновляет % только у uploading и клампит 0..100', () => {
    let state = enqueue('a.png')
    state = uploadReducer(state, { type: 'start', id: 'f0' })
    state = uploadReducer(state, { type: 'progress', id: 'f0', progress: 150 })
    expect(state[0]!.progress).toBe(100)
    state = uploadReducer(state, { type: 'progress', id: 'f0', progress: -5 })
    expect(state[0]!.progress).toBe(0)
  })

  it('progress игнорируется для не-uploading', () => {
    let state = enqueue('a.png') // idle
    state = uploadReducer(state, { type: 'progress', id: 'f0', progress: 50 })
    expect(state[0]!.progress).toBe(0)
  })

  it('success: → done, progress 100', () => {
    let state = enqueue('a.png')
    state = uploadReducer(state, { type: 'start', id: 'f0' })
    state = uploadReducer(state, { type: 'success', id: 'f0' })
    expect(state[0]!.status).toBe('done')
    expect(state[0]!.progress).toBe(100)
  })

  it('error: → error c сообщением', () => {
    let state = enqueue('a.png')
    state = uploadReducer(state, { type: 'start', id: 'f0' })
    state = uploadReducer(state, { type: 'error', id: 'f0', error: 'boom' })
    expect(state[0]!.status).toBe('error')
    expect(state[0]!.error).toBe('boom')
  })

  it('remove убирает элемент; clearSettled — только done/error', () => {
    let state = enqueue('a.png', 'b.png', 'c.png')
    state = uploadReducer(state, { type: 'success', id: 'f0' })
    state = uploadReducer(state, { type: 'error', id: 'f1', error: 'x' })
    // f2 остаётся idle
    state = uploadReducer(state, { type: 'clearSettled' })
    expect(state.map((i) => i.id)).toEqual(['f2'])
    state = uploadReducer(state, { type: 'remove', id: 'f2' })
    expect(state).toHaveLength(0)
  })

  it('reset очищает очередь', () => {
    let state = enqueue('a.png')
    state = uploadReducer(state, { type: 'reset' })
    expect(state).toEqual([])
  })
})

describe('селекторы очереди', () => {
  it('nextPending возвращает первый idle', () => {
    let state = enqueue('a', 'b')
    state = uploadReducer(state, { type: 'start', id: 'f0' })
    expect(nextPending(state)?.id).toBe('f1')
  })

  it('nextPending undefined, если нет idle', () => {
    let state = enqueue('a')
    state = uploadReducer(state, { type: 'start', id: 'f0' })
    expect(nextPending(state)).toBeUndefined()
  })

  it('isAllSettled true, когда всё done/error', () => {
    let state = enqueue('a', 'b')
    state = uploadReducer(state, { type: 'success', id: 'f0' })
    expect(isAllSettled(state)).toBe(false)
    state = uploadReducer(state, { type: 'error', id: 'f1', error: 'x' })
    expect(isAllSettled(state)).toBe(true)
  })

  it('isBusy true при наличии idle/uploading', () => {
    let state = enqueue('a')
    expect(isBusy(state)).toBe(true)
    state = uploadReducer(state, { type: 'success', id: 'f0' })
    expect(isBusy(state)).toBe(false)
  })

  it('overallProgress усредняет (done = 100)', () => {
    let state = enqueue('a', 'b')
    state = uploadReducer(state, { type: 'success', id: 'f0' }) // 100
    state = uploadReducer(state, { type: 'start', id: 'f1' })
    state = uploadReducer(state, { type: 'progress', id: 'f1', progress: 40 })
    expect(overallProgress(state)).toBe(70)
  })

  it('overallProgress пустой очереди → 0', () => {
    expect(overallProgress([])).toBe(0)
  })
})
