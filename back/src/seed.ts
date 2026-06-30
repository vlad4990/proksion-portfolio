// Seed-данные публичного API (docs/architecture.md §3, §7). Наполняет БД правдоподобным
// деревом категории → подкатегории → работы → картинки с реалистичными `key_base`
// (`images/{workId}/{imageId}`) и натуральными w/h. Реальных файлов в MinIO ещё нет
// (это задача 04) — фронт-листинг можно проверять на placeholder-картинках.
//
// Идемпотентно: на каждом прогоне таблицы очищаются и наполняются заново — повтор даёт
// идентичный результат. Используется и как фикстуры тестами (см. *.test.ts).
//
// Запуск: `bun run seed` (см. package.json) — наполняет БД из DATABASE_PATH.

import type { Database } from 'bun:sqlite'
import { openDb } from './db/index.ts'
import { loadConfig } from './config.ts'
import { createRepos } from './repos.ts'
import { slugify, uniqueSlug } from './slug.ts'

interface SeedImage {
  width: number
  height: number
  alt: string
  lqip?: string
}
interface SeedWork {
  title: string
  description: string
  images: SeedImage[]
}
interface SeedSubcategory {
  title: string
  description?: string
  works: SeedWork[]
}
interface SeedCategory {
  title: string
  description?: string
  subcategories: SeedSubcategory[]
}

// Крошечный правдоподобный LQIP-плейсхолдер (на этом этапе — не настоящий blur, задача 04).
const LQIP = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4='

const SEED: SeedCategory[] = [
  {
    title: 'Брендинг',
    description: 'Айдентика и знаки',
    subcategories: [
      {
        title: 'Логотипы',
        works: [
          {
            title: 'Кофейня Утро',
            description: 'Логотип и знак для городской кофейни.',
            images: [{ width: 1200, height: 800, alt: 'Логотип кофейни Утро', lqip: LQIP }],
          },
          {
            title: 'Студия Йога',
            description: 'Минималистичный знак для студии йоги.',
            images: [
              { width: 900, height: 1200, alt: 'Вертикальная версия знака' },
              { width: 1200, height: 900, alt: 'Горизонтальная версия знака', lqip: LQIP },
            ],
          },
        ],
      },
      {
        title: 'Фирменный стиль',
        works: [
          {
            title: 'Маркетплейс Лес',
            description: 'Фирменный стиль для эко-маркетплейса.',
            images: [
              { width: 1000, height: 1000, alt: 'Паттерн', lqip: LQIP },
              { width: 1400, height: 900, alt: 'Носители стиля' },
              { width: 800, height: 1200, alt: 'Упаковка' },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Полиграфия',
    description: 'Печатные макеты',
    subcategories: [
      {
        title: 'Афиши',
        works: [
          {
            title: 'Джаз-фестиваль',
            description: 'Афиша городского джаз-фестиваля.',
            images: [{ width: 850, height: 1200, alt: 'Афиша джаз-фестиваля', lqip: LQIP }],
          },
          {
            title: 'Кинопоказ Ретро',
            description: 'Серия афиш для ретро-кинопоказа.',
            images: [{ width: 850, height: 1200, alt: 'Афиша кинопоказа' }],
          },
        ],
      },
      {
        title: 'Обложки',
        works: [
          {
            title: 'Роман Север',
            description: 'Обложка для художественного романа.',
            images: [{ width: 800, height: 1200, alt: 'Обложка романа Север', lqip: LQIP }],
          },
        ],
      },
    ],
  },
  {
    title: 'Веб-дизайн',
    description: 'Интерфейсы и лендинги',
    subcategories: [
      {
        title: 'Лендинги',
        works: [
          {
            title: 'Эко-продукты',
            description: 'Лендинг для магазина эко-продуктов.',
            images: [
              { width: 1440, height: 900, alt: 'Первый экран', lqip: LQIP },
              { width: 1440, height: 1024, alt: 'Каталог' },
            ],
          },
        ],
      },
    ],
  },
]

export interface SeedSummary {
  categories: number
  subcategories: number
  works: number
  images: number
}

/**
 * Идемпотентно наполняет `db` seed-набором: очищает дерево и пересоздаёт его в одной
 * транзакции. Возвращает счётчики созданных сущностей. `key_base` картинок —
 * `images/{workId}/{imageId}` (проставляется после вставки, когда оба id известны).
 */
export function seed(db: Database): SeedSummary {
  const repos = createRepos(db)
  const summary: SeedSummary = { categories: 0, subcategories: 0, works: 0, images: 0 }

  db.transaction(() => {
    // Очистка (idempotency). DELETE FROM category каскадит вниз, но чистим явно сверху вниз
    // для наглядности и независимости от порядка каскадов.
    db.run('DELETE FROM image')
    db.run('DELETE FROM work')
    db.run('DELETE FROM subcategory')
    db.run('DELETE FROM category')

    const categorySlugs: string[] = []
    SEED.forEach((seedCategory, categoryIndex) => {
      const categorySlug = uniqueSlug(slugify(seedCategory.title), categorySlugs)
      categorySlugs.push(categorySlug)
      const category = repos.category.create({
        slug: categorySlug,
        title: seedCategory.title,
        description: seedCategory.description ?? null,
        sort_order: categoryIndex,
      })
      summary.categories += 1

      const subcategorySlugs: string[] = []
      seedCategory.subcategories.forEach((seedSubcategory, subcategoryIndex) => {
        const subcategorySlug = uniqueSlug(slugify(seedSubcategory.title), subcategorySlugs)
        subcategorySlugs.push(subcategorySlug)
        const subcategory = repos.subcategory.create({
          category_id: category.id,
          slug: subcategorySlug,
          title: seedSubcategory.title,
          description: seedSubcategory.description ?? null,
          sort_order: subcategoryIndex,
        })
        summary.subcategories += 1

        const workSlugs: string[] = []
        seedSubcategory.works.forEach((seedWork, workIndex) => {
          const workSlug = uniqueSlug(slugify(seedWork.title), workSlugs)
          workSlugs.push(workSlug)
          const work = repos.work.create({
            subcategory_id: subcategory.id,
            slug: workSlug,
            title: seedWork.title,
            description: seedWork.description,
            sort_order: workIndex,
          })
          summary.works += 1

          let coverImageId: number | null = null
          seedWork.images.forEach((seedImage, imageIndex) => {
            // key_base зависит от обоих id — создаём с временным значением, затем проставляем.
            const image = repos.image.create({
              work_id: work.id,
              key_base: 'pending',
              width: seedImage.width,
              height: seedImage.height,
              alt: seedImage.alt,
              lqip: seedImage.lqip ?? null,
              sort_order: imageIndex,
            })
            repos.image.update(image.id, { key_base: `images/${work.id}/${image.id}` })
            if (coverImageId === null) coverImageId = image.id
            summary.images += 1
          })

          if (coverImageId !== null) repos.work.update(work.id, { cover_image_id: coverImageId })
        })
      })
    })
  })()

  return summary
}

// CLI-точка входа: `bun run seed`.
if (import.meta.main) {
  const config = loadConfig()
  const db = openDb(config.databasePath)
  const summary = seed(db)
  console.log(
    `[seed] ${summary.categories} categories, ${summary.subcategories} subcategories, ` +
      `${summary.works} works, ${summary.images} images → ${config.databasePath}`,
  )
}
