import { describe, expect, test } from 'bun:test'
import { slugify, transliterate, uniqueSlug } from './slug.ts'

describe('transliterate', () => {
  test('basic ru → lat (preserves case)', () => {
    expect(transliterate('Брендинг')).toBe('Brending')
    expect(transliterate('журнал')).toBe('zhurnal')
    expect(transliterate('Журнал')).toBe('Zhurnal')
    expect(transliterate('Щука')).toBe('Schuka')
    expect(transliterate('Ёж')).toBe('Ezh')
    expect(transliterate('объявление')).toBe('obyavlenie')
  })

  test('passes latin / digits / punctuation through', () => {
    expect(transliterate('Web 2.0')).toBe('Web 2.0')
  })
})

describe('slugify', () => {
  test("'Брендинг' → 'brending'", () => {
    expect(slugify('Брендинг')).toBe('brending')
  })

  test('spaces, case and junk normalize', () => {
    expect(slugify('  Веб Дизайн!  ')).toBe('veb-dizayn')
    expect(slugify('Hello, World')).toBe('hello-world')
    expect(slugify('A / B')).toBe('a-b')
    expect(slugify('Много   пробелов')).toBe('mnogo-probelov')
  })

  test('empty / untranslatable → deterministic non-empty fallback', () => {
    expect(slugify('')).toBe('item')
    expect(slugify('   ')).toBe('item')
    expect(slugify('!!!')).toBe('item')
    expect(slugify('日本語')).toBe('item')
    // caller may supply its own fallback (e.g. short id)
    expect(slugify('', 'work-5')).toBe('work-5')
  })
})

describe('uniqueSlug', () => {
  test('returns base when free', () => {
    expect(uniqueSlug('brending', [])).toBe('brending')
    expect(uniqueSlug('brending', ['other'])).toBe('brending')
  })

  test('adds -2, -3 ... on collision', () => {
    expect(uniqueSlug('brending', ['brending'])).toBe('brending-2')
    expect(uniqueSlug('brending', ['brending', 'brending-2'])).toBe('brending-3')
  })

  test('finds first free slot, skipping gaps', () => {
    expect(uniqueSlug('a', ['a', 'a-2', 'a-4'])).toBe('a-3')
  })
})
