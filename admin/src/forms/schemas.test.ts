import { describe, expect, it } from 'vitest'

import type { CategoryDetail, WorkDetail } from '@/api/types'

import {
  categoryDetailToValues,
  categorySchema,
  emptyToNull,
  namedEntitySchema,
  namedEntityToValues,
  tagSchema,
  tagToValues,
  toCategoryInput,
  toCategoryPatch,
  toSubcategoryInput,
  toTagInput,
  toTagPatch,
  toWorkInput,
  toWorkPatch,
  workDetailToValues,
  workSchema,
  type CategoryFormValues,
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
    const r = workSchema.safeParse({
      title: '',
      slug: '',
      description: '',
      seamless: false,
      carousel: false,
    })
    expect(r.success).toBe(true)
  })

  it('seamless обязателен и строго boolean (чекбокс всегда имеет значение)', () => {
    expect(
      workSchema.safeParse({ title: '', slug: '', description: '', carousel: false }).success,
    ).toBe(false)
    expect(
      workSchema.safeParse({
        title: '',
        slug: '',
        description: '',
        seamless: 'yes',
        carousel: false,
      }).success,
    ).toBe(false)
  })

  it('carousel обязателен и строго boolean (чекбокс всегда имеет значение)', () => {
    expect(
      workSchema.safeParse({ title: '', slug: '', description: '', seamless: false }).success,
    ).toBe(false)
    expect(
      workSchema.safeParse({
        title: '',
        slug: '',
        description: '',
        seamless: false,
        carousel: 'yes',
      }).success,
    ).toBe(false)
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
    expect(
      toWorkInput({ title: '', slug: '', description: '', seamless: false, carousel: false }, 3),
    ).toEqual({
      subcategory_id: 3,
      title: null,
      description: null,
      seamless: false,
      carousel: false,
    })
  })
  it('create: title/slug/description заданы', () => {
    expect(
      toWorkInput(
        { title: 'Афиша', slug: 'afisha', description: 'd', seamless: false, carousel: false },
        3,
      ),
    ).toEqual({
      subcategory_id: 3,
      title: 'Афиша',
      slug: 'afisha',
      description: 'd',
      seamless: false,
      carousel: false,
    })
  })
  it('patch: без subcategory_id', () => {
    expect(
      toWorkPatch({ title: 'Афиша', slug: '', description: '', seamless: false, carousel: false }),
    ).toEqual({
      title: 'Афиша',
      description: null,
      seamless: false,
      carousel: false,
    })
  })
  it('«единое полотно»: чекбокс уходит и в create, и в patch', () => {
    const values = { title: 'Полотно', slug: '', description: '', seamless: true, carousel: false }
    expect(toWorkInput(values, 3).seamless).toBe(true)
    expect(toWorkPatch(values).seamless).toBe(true)
  })

  it('«карусель»: чекбокс уходит и в create, и в patch', () => {
    const values = { title: 'Слайды', slug: '', description: '', seamless: false, carousel: true }
    expect(toWorkInput(values, 3).carousel).toBe(true)
    expect(toWorkPatch(values).carousel).toBe(true)
  })
})

describe('categorySchema / toCategoryPatch (контент секции, редизайн §5.5)', () => {
  const values: CategoryFormValues = {
    title: 'Графика',
    slug: 'grafika',
    description: 'Коротко',
    kicker: 'КОММЕРЧЕСКАЯ ГРАФИКА',
    meta_role: 'SMM · ПРОМО-ГРАФИКА',
    period: '2023 — 2026',
    description_long: 'Длинный текст',
    display_variant: 'strip',
  }

  it('невалидный display_variant отвергается схемой', () => {
    expect(categorySchema.safeParse({ ...values, display_variant: 'grid' }).success).toBe(false)
  })

  it('валидные значения проходят', () => {
    expect(categorySchema.safeParse(values).success).toBe(true)
  })

  it('все контентные поля уходят в patch как есть', () => {
    expect(toCategoryPatch(values)).toEqual({
      title: 'Графика',
      slug: 'grafika',
      description: 'Коротко',
      kicker: 'КОММЕРЧЕСКАЯ ГРАФИКА',
      meta_role: 'SMM · ПРОМО-ГРАФИКА',
      period: '2023 — 2026',
      description_long: 'Длинный текст',
      display_variant: 'strip',
    })
  })

  it('очищенные поля → null (сбросить в БД), пустой слаг опускается', () => {
    expect(
      toCategoryPatch({
        ...values,
        slug: '',
        description: '',
        kicker: '',
        meta_role: '   ',
        period: '',
        description_long: '',
      }),
    ).toEqual({
      title: 'Графика',
      description: null,
      kicker: null,
      meta_role: null,
      period: null,
      description_long: null,
      display_variant: 'strip',
    })
  })

  it('categoryDetailToValues: null-поля → пустые строки, variant сохраняется', () => {
    const detail: CategoryDetail = {
      id: 1,
      slug: 'grafika',
      title: 'Графика',
      description: null,
      sort_order: 0,
      kicker: null,
      meta_role: null,
      period: '2023 — 2026',
      display_variant: 'cards',
      description_long: null,
      work_count: 3,
      updated_max: null,
      subcategories: [],
    }
    expect(categoryDetailToValues(detail)).toEqual({
      title: 'Графика',
      slug: 'grafika',
      description: '',
      kicker: '',
      meta_role: '',
      period: '2023 — 2026',
      description_long: '',
      display_variant: 'cards',
    })
  })
})

describe('теги: схема и маппинг', () => {
  it('пустое название → ошибка', () => {
    expect(tagSchema.safeParse({ title: '  ', slug: '' }).success).toBe(false)
  })

  it('toTagInput: пустой слаг опускается (бэк сгенерит транслит)', () => {
    expect(toTagInput({ title: 'Айдентика', slug: '' })).toEqual({ title: 'Айдентика' })
    expect(toTagInput({ title: 'Айдентика', slug: 'ident' })).toEqual({
      title: 'Айдентика',
      slug: 'ident',
    })
  })

  it('toTagPatch: слаг не шлётся, если не менялся (переименование не трогает ссылку)', () => {
    expect(toTagPatch({ title: 'Плакаты', slug: 'afishi' }, 'afishi')).toEqual({
      title: 'Плакаты',
    })
  })

  it('toTagPatch: изменённый слаг уходит в patch', () => {
    expect(toTagPatch({ title: 'Плакаты', slug: 'plakaty' }, 'afishi')).toEqual({
      title: 'Плакаты',
      slug: 'plakaty',
    })
  })

  it('tagToValues: строка тега → значения формы', () => {
    expect(tagToValues({ title: 'Айдентика', slug: 'identika' })).toEqual({
      title: 'Айдентика',
      slug: 'identika',
    })
  })
})

describe('entity → form', () => {
  it('namedEntityToValues: description null → пустая строка', () => {
    expect(
      namedEntityToValues({ title: 'T', slug: 's', description: null }),
    ).toEqual({ title: 'T', slug: 's', description: '' })
  })

  it('workDetailToValues: null title/description → пустые строки, флаги как есть', () => {
    const work: WorkDetail = {
      id: 1,
      slug: 'w',
      title: null,
      description: null,
      cover_image_id: null,
      seamless: false,
      carousel: false,
      tag_ids: [],
      images: [],
    }
    expect(workDetailToValues(work)).toEqual({
      title: '',
      slug: 'w',
      description: '',
      seamless: false,
      carousel: false,
    })
    expect(workDetailToValues({ ...work, seamless: true }).seamless).toBe(true)
    expect(workDetailToValues({ ...work, carousel: true }).carousel).toBe(true)
  })
})
