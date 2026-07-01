// Unit-тесты пайплайна (docs/architecture.md §6). Гоняются всегда (без MinIO): на вход —
// фикстура-картинка 3000×2000, на выход — натуральные w/h, набор вариантов thumb/full в
// avif/webp/jpg (проверка по сигнатуре байтов) и короткий base64 LQIP.

import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import sharp from 'sharp'
import { processImage, VARIANT_MAX_EDGE } from './pipeline.ts'
import { IMAGE_FORMATS, IMAGE_VARIANTS } from '../media-url.ts'

const FIXTURE = join(import.meta.dir, '__fixtures__', 'sample.png')
const input = new Uint8Array(await Bun.file(FIXTURE).arrayBuffer())
// Прогоняем пайплайн один раз на уровне модуля (top-level await) — describe-колбэк
// синхронный, поэтому результат вычисляем здесь и переиспользуем во всех проверках.
const result = await processImage(input)

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
})
