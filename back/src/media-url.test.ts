import { describe, expect, test } from 'bun:test'
import { imageVariants, mediaUrl, IMAGE_FORMATS, IMAGE_VARIANTS } from './media-url.ts'

describe('mediaUrl', () => {
  test('builds /media/{key_base}/{variant}.{ext}', () => {
    expect(mediaUrl('images/3/7', 'thumb', 'jpg')).toBe('/media/images/3/7/thumb.jpg')
    expect(mediaUrl('images/3/7', 'full', 'avif')).toBe('/media/images/3/7/full.avif')
  })

  test('is a pure string builder (no normalization, no S3 access)', () => {
    expect(mediaUrl('a/b', 'orig', 'png')).toBe('/media/a/b/orig.png')
  })
})

describe('imageVariants', () => {
  test('returns the full thumb/full × avif/webp/jpg matrix', () => {
    const v = imageVariants('images/3/7')
    expect(Object.keys(v).sort()).toEqual(['full', 'thumb'])
    expect(v.thumb).toEqual({
      avif: '/media/images/3/7/thumb.avif',
      webp: '/media/images/3/7/thumb.webp',
      jpg: '/media/images/3/7/thumb.jpg',
    })
    expect(v.full).toEqual({
      avif: '/media/images/3/7/full.avif',
      webp: '/media/images/3/7/full.webp',
      jpg: '/media/images/3/7/full.jpg',
    })
  })

  test('covers every declared variant × format', () => {
    const v = imageVariants('k')
    for (const variant of IMAGE_VARIANTS) {
      for (const format of IMAGE_FORMATS) {
        expect(v[variant][format]).toBe(`/media/k/${variant}.${format}`)
      }
    }
  })
})
