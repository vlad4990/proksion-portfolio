// Оркестратор хранения картинки (docs/architecture.md §5, §6): склеивает пайплайн и S3.
// Граница: pipeline.ts не знает про S3, s3.ts не знает про картинки — связывает их store.ts.
//
// storeImage(store, workId, imageId, input):
//   1) processImage(input) → w/h + варианты thumb/full × avif/webp/jpg + lqip;
//   2) залить каждый вариант под `images/{workId}/{imageId}/{variant}.{ext}`;
//   3) вернуть метаданные для записи в `image` репозиторием (задача 06).
//
// Иммутабельность/идемпотентность: key_base детерминирован по (workId,imageId), PUT
// перезаписывает — повторная заливка той же картинки не плодит дублей.

import { IMAGE_FORMATS, IMAGE_VARIANTS, type ImageFormat } from '../media-url.ts'
import type { ObjectStore } from '../storage/s3.ts'
import { processImage } from './pipeline.ts'

/** content-type по формату варианта (jpg → image/jpeg). */
const CONTENT_TYPE: Record<ImageFormat, string> = {
  avif: 'image/avif',
  webp: 'image/webp',
  jpg: 'image/jpeg',
}

/** База ключа объекта в MinIO: `images/{workId}/{imageId}` (без варианта/расширения). */
export function imageKeyBase(workId: number, imageId: number): string {
  return `images/${workId}/${imageId}`
}

export interface StoredImage {
  /** База ключа (в `image.key_base`); публичный URL варианта = `/media/{key_base}/{variant}.{ext}`. */
  key_base: string
  /** Натуральная ширина оригинала. */
  width: number
  /** Натуральная высота оригинала. */
  height: number
  /** LQIP-плейсхолдер (data-URI), для `image.lqip`. */
  lqip: string
}

/**
 * Обрабатывает и заливает все варианты картинки в MinIO под `images/{workId}/{imageId}/…`.
 * Возвращает метаданные, готовые для вставки в таблицу `image` (задача 06). Запись в БД здесь
 * НЕ делается — это примитив хранилища.
 */
export async function storeImage(
  store: ObjectStore,
  workId: number,
  imageId: number,
  input: Uint8Array | ArrayBuffer | Buffer,
): Promise<StoredImage> {
  const processed = await processImage(input)
  const keyBase = imageKeyBase(workId, imageId)

  const uploads: Promise<void>[] = []
  for (const variant of IMAGE_VARIANTS) {
    for (const format of IMAGE_FORMATS) {
      const key = `${keyBase}/${variant}.${format}`
      uploads.push(store.put(key, processed.variants[variant][format], CONTENT_TYPE[format]))
    }
  }
  await Promise.all(uploads)

  return { key_base: keyBase, width: processed.width, height: processed.height, lqip: processed.lqip }
}
