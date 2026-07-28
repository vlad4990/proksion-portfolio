import { describe, expect, it } from 'vitest'

import type { WorkDetail } from '@/api/types'

import {
  emptyToNull,
  namedEntitySchema,
  namedEntityToValues,
  toCategoryInput,
  toSubcategoryInput,
  toWorkInput,
  toWorkPatch,
  workDetailToValues,
  workSchema,
} from './schemas'

describe('namedEntitySchema (категория/подкатегория)', () => {
  it('пустой title → ошибка', () => {
    const r = namedEntitySchema.safeParse({ title: '   ', slug: '', description: '' })
    expect(r.success).toBe(false)
  })

  it('тримит title и slug', () => {
    const r = namedEntitySchema.safeParse({ title: '  Баннеры ', slug: '  baN  ', description: 'x' })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.title).toBe('Баннеры')
      expect(r.data.slug).toBe('baN')
    }
  })
})

describe('workSchema', () => {
  it('пустой title допустим (работа без названия)', () => {
    const r = workSchema.safeParse({ title: '', slug: '', description: '' })
    expect(r.success).toBe(true)
  })
})

describe('emptyToNull', () => {
  it('пусто/пробелы → null', () => {
    expect(emptyToNull('')).toBeNull()
    expect(emptyToNull('   ')).toBeNull()
  })
  it('непустое → исходная строка (без тримминга)', () => {
    expect(emptyToNull('  **md**  ')).toBe('  **md**  ')
  })
})

describe('toCategoryInput', () => {
  it('пустой slug опускается; описание → null', () => {
    expect(toCategoryInput({ title: 'Проект', slug: '', description: '' })).toEqual({
      title: 'Проект',
      description: null,
    })
  })
  it('непустой slug добавляется; описание сохраняется', () => {
    expect(toCategoryInput({ title: 'Проект', slug: 'proj', description: 'Текст' })).toEqual({
      title: 'Проект',
      slug: 'proj',
      description: 'Текст',
    })
  })
})

describe('toSubcategoryInput', () => {
  it('добавляет category_id', () => {
    expect(toSubcategoryInput({ title: 'Баннеры', slug: '', description: '' }, 7)).toEqual({
      category_id: 7,
      title: 'Баннеры',
      description: null,
    })
  })
})

describe('toWorkInput / toWorkPatch', () => {
  it('create: title пустой → null, subcategory_id добавлен', () => {
    expect(toWorkInput({ title: '', slug: '', description: '' }, 3)).toEqual({
      subcategory_id: 3,
      title: null,
      description: null,
    })
  })
  it('create: title/slug/description заданы', () => {
    expect(toWorkInput({ title: 'Афиша', slug: 'afisha', description: 'd' }, 3)).toEqual({
      subcategory_id: 3,
      title: 'Афиша',
      slug: 'afisha',
      description: 'd',
    })
  })
  it('patch: без subcategory_id', () => {
    expect(toWorkPatch({ title: 'Афиша', slug: '', description: '' })).toEqual({
      title: 'Афиша',
      description: null,
    })
  })
})

describe('entity → form', () => {
  it('namedEntityToValues: description null → пустая строка', () => {
    expect(
      namedEntityToValues({ title: 'T', slug: 's', description: null }),
    ).toEqual({ title: 'T', slug: 's', description: '' })
  })

  it('workDetailToValues: null title/description → пустые строки', () => {
    const work: WorkDetail = {
      id: 1,
      slug: 'w',
      title: null,
      description: null,
      cover_image_id: null,
      tag_ids: [],
      images: [],
    }
    expect(workDetailToValues(work)).toEqual({ title: '', slug: 'w', description: '' })
  })
})
