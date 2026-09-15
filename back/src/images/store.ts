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

import {
  IMAGE_FORMATS,
  IMAGE_VARIANTS,
  type ImageAnim,
  type ImageFormat,
} from '../media-url.ts'
import type { ObjectStore } from '../storage/s3.ts'
import { processImage } from './pipeline.ts'

/** content-type по формату варианта (jpg → image/jpeg). */
const CONTENT_TYPE: Record<ImageFormat, string> = {
  avif: 'image/avif',
  webp: 'image/webp',
  jpg: 'image/jpeg',
}
/** Ключ GIF-подстраховки: оригинальная лента кадров, если webp её не заменяет (см. media-url.ts). */
const GIF_CONTENT_TYPE = 'image/gif'

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
  /** Носитель анимации для `image.anim` (`null` — статичная картинка). */
  anim: ImageAnim | null
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
  // GIF-подстраховка: оригинальную ленту кладём рядом отдельным ключом. Перезаливка той же
  // картинки другим файлом могла бы оставить `full.gif` от прошлой версии висеть (PUT
  // перезаписывает только свои ключи), поэтому в webp-ветке ключ явно убираем.
  const gifKey = `${keyBase}/full.gif`
  uploads.push(
    processed.anim === 'gif'
      ? store.put(gifKey, toBytes(input), GIF_CONTENT_TYPE)
      : store.delete(gifKey),
  )
  await Promise.all(uploads)

  return {
    key_base: keyBase,
    width: processed.width,
    height: processed.height,
    lqip: processed.lqip,
    anim: processed.anim,
  }
}

/** Приводит вход к `Uint8Array` — заливаем ровно те байты, что прислали (без перекодирования). */
function toBytes(input: Uint8Array | ArrayBuffer | Buffer): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input)
}
