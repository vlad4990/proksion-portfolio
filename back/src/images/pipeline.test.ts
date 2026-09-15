// Unit-тесты пайплайна (docs/architecture.md §6). Гоняются всегда (без MinIO): на вход —
// фикстура-картинка 3000×2000, на выход — натуральные w/h, набор вариантов thumb/full в
// avif/webp/jpg (проверка по сигнатуре байтов) и короткий base64 LQIP.
//
// Вторая фикстура — анимированный GIF 160×120 × 3 кадра: проверяем, что анимация доживает
// до webp-вариантов, а размеры считаются по КАДРУ, а не по ленте кадров.

import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import sharp from 'sharp'
import { processImage, VARIANT_MAX_EDGE } from './pipeline.ts'
import { IMAGE_FORMATS, IMAGE_VARIANTS } from '../media-url.ts'

const FIXTURE = join(import.meta.dir, '__fixtures__', 'sample.png')
const input = new Uint8Array(await Bun.file(FIXTURE).arrayBuffer())
const ANIM_FIXTURE = join(import.meta.dir, '__fixtures__', 'sample-anim.gif')
const animInput = new Uint8Array(await Bun.file(ANIM_FIXTURE).arrayBuffer())
// Прогоняем пайплайн один раз на уровне модуля (top-level await) — describe-колбэк
// синхронный, поэтому результат вычисляем здесь и переиспользуем во всех проверках.
const result = await processImage(input)
const anim = await processImage(animInput)

/** Число кадров в закодированных байтах (1 — статичная картинка). */
async function pages(bytes: Uint8Array): Promise<number> {
  return (await sharp(bytes, { animated: true }).metadata()).pages ?? 1
}

// Сигнатуры форматов по «магическим» байтам (не доверяем расширению/метаданным).
function sniff(bytes: Uint8Array): 'avif' | 'webp' | 'jpg' | 'unknown' {
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...bytes.subarray(from, to))
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp'
  if (ascii(4, 8) === 'ftyp' && ascii(8, 12) === 'avif') return 'avif'
  return 'unknown'
}

describe('processImage', () => {
  test('извлекает корректные натуральные w/h из фикстуры', () => {
    expect(result.width).toBe(3000)
    expect(result.height).toBe(2000)
  })

  test('генерирует оба размера в каждом из трёх форматов', () => {
    expect(Object.keys(result.variants).sort()).toEqual(['full', 'thumb'])
    for (const variant of IMAGE_VARIANTS) {
      for (const format of IMAGE_FORMATS) {
        const bytes = result.variants[variant][format]
        expect(bytes.byteLength).toBeGreaterThan(0)
        // формат подтверждаем сигнатурой байтов, а не расширением
        expect(sniff(bytes)).toBe(format)
      }
    }
  })

  test('thumb вписан в ~800px, full — в ~2000px по бóльшей стороне', async () => {
    for (const variant of IMAGE_VARIANTS) {
      const edge = VARIANT_MAX_EDGE[variant]
      for (const format of IMAGE_FORMATS) {
        const meta = await sharp(result.variants[variant][format]).metadata()
        const longer = Math.max(meta.width ?? 0, meta.height ?? 0)
        // ландшафтная фикстура 3:2 → бóльшая сторона ровно равна целевому пределу
        expect(longer).toBe(edge)
      }
    }
  })

  test('lqip — непустая короткая base64 data-URI строка', () => {
    expect(result.lqip).toMatch(/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/)
    // «короткая»: крошечный плейсхолдер, не полноценная картинка
    expect(result.lqip.length).toBeLessThan(1000)
    expect(result.lqip.length).toBeGreaterThan(16)
  })

  test('не апскейлит: вариант никогда не больше оригинала', async () => {
    const meta = await sharp(result.variants.full.webp).metadata()
    expect(meta.width ?? 0).toBeLessThanOrEqual(result.width)
    expect(meta.height ?? 0).toBeLessThanOrEqual(result.height)
  })

  test('статичная картинка не помечается анимированной', () => {
    expect(result.anim).toBeNull()
  })
})

describe('processImage (анимированный GIF)', () => {
  test('натуральные размеры — по КАДРУ, а не по ленте кадров', () => {
    // sharp в animated-режиме отдаёт height всей ленты (120 × 3 = 360) — фронт по таким
    // размерам поставил бы вытянутый aspect-ratio и порвал бы раскладку.
    expect(anim.width).toBe(160)
    expect(anim.height).toBe(120)
  })

  test('анимация живёт в webp-вариантах (оба размера)', async () => {
    expect(anim.anim).toBe('webp')
    expect(await pages(anim.variants.thumb.webp)).toBe(3)
    expect(await pages(anim.variants.full.webp)).toBe(3)
  })

  test('avif/jpg остаются статичным первым кадром', async () => {
    for (const variant of IMAGE_VARIANTS) {
      for (const format of ['avif', 'jpg'] as const) {
        const bytes = anim.variants[variant][format]
        expect(sniff(bytes)).toBe(format)
        expect(await pages(bytes)).toBe(1)
      }
    }
  })

  test('кадры сохраняют пропорции при ресайзе (высота кадра, не ленты)', async () => {
    const meta = await sharp(anim.variants.full.webp, { animated: true }).metadata()
    expect(meta.width).toBe(160)
    expect(meta.pageHeight).toBe(120)
  })

  test('lqip строится по первому кадру', () => {
    expect(anim.lqip).toMatch(/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/)
    expect(anim.lqip.length).toBeLessThan(1000)
  })

  test('лента длиннее бюджета → анимацию несёт только GIF-оригинал, webp-варианты статичны', async () => {
    // Бюджет заведомо меньше фикстуры (160×120×3 = 57 600 пикселей ленты).
    const tight = await processImage(animInput, { animFullBudget: 1000 })
    expect(tight.anim).toBe('gif')
    // Тяжёлую ленту не тащим в тайлы листинга: thumb там статичный первый кадр.
    expect(await pages(tight.variants.thumb.webp)).toBe(1)
    expect(await pages(tight.variants.full.webp)).toBe(1)
  })

  test('не-GIF анимация сверх бюджета деградирует в статику (подстраховывать нечем)', async () => {
    const animWebp = await sharp(animInput, { animated: true }).webp().toBuffer()
    const degraded = await processImage(new Uint8Array(animWebp), { animFullBudget: 1000 })
    expect(degraded.anim).toBeNull()
    // Раз анимации в контракте нет — лишних кадров не храним ни в одном варианте.
    expect(await pages(degraded.variants.full.webp)).toBe(1)
    expect(await pages(degraded.variants.thumb.webp)).toBe(1)
  })
})
