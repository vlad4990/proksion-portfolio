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
import type { DisplayVariant } from './types.ts'

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
  /** Заголовки тегов из `TAGS` (m2m, порядок не значим). */
  tags?: string[]
  /** Позиция в кураторской витрине СВОЕЙ категории (0 = hero-слот); нет поля — не в витрине. */
  featured?: number
}
interface SeedSubcategory {
  title: string
  description?: string
  works: SeedWork[]
}
interface SeedCategory {
  title: string
  description?: string
  // Контент секции/страницы категории (спека редизайна §4) — заполнен не у всех категорий,
  // чтобы в фикстурах были и пустые поля тоже.
  kicker?: string
  meta_role?: string
  period?: string
  description_long?: string
  display_variant?: DisplayVariant
  subcategories: SeedSubcategory[]
}

// Крошечный правдоподобный LQIP-плейсхолдер (на этом этапе — не настоящий blur, задача 04).
const LQIP = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4='

// Глобальные теги-фильтры корневой /projects (спека редизайна §1.1). Работы ссылаются
// на них по заголовку — слаги генерируются транслитом, как у остальных сущностей.
const TAGS: string[] = ['Айдентика', 'Печать', 'Диджитал']

const SEED: SeedCategory[] = [
  {
    title: 'Брендинг',
    description: 'Айдентика и знаки',
    kicker: 'КОММЕРЧЕСКАЯ ГРАФИКА',
    meta_role: 'ЛОГОТИПЫ · ФИРМЕННЫЙ СТИЛЬ',
    period: '2023 — 2026',
    description_long:
      'Знаки, логотипы и фирменные стили для небольших студий и локального бизнеса: ' +
      'от первого эскиза до готовых носителей.',
    display_variant: 'showcase',
    subcategories: [
      {
        title: 'Логотипы',
        works: [
          {
            title: 'Кофейня Утро',
            description: 'Логотип и знак для городской кофейни.',
            tags: ['Айдентика'],
            featured: 1,
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
            tags: ['Айдентика', 'Диджитал'],
            featured: 0,
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
    kicker: 'ПЕЧАТНАЯ ГРАФИКА',
    meta_role: 'АФИШИ · ОБЛОЖКИ',
    period: '2024 — 2026',
    description_long:
      'Афиши, обложки и печатные серии: работа с типографикой и подготовка макетов к печати.',
    display_variant: 'strip',
    subcategories: [
      {
        title: 'Афиши',
        works: [
          {
            title: 'Джаз-фестиваль',
            description: 'Афиша городского джаз-фестиваля.',
            tags: ['Печать'],
            featured: 0,
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
            tags: ['Печать'],
            featured: 1,
            images: [{ width: 800, height: 1200, alt: 'Обложка романа Север', lqip: LQIP }],
          },
        ],
      },
    ],
  },
  {
    // Витрина и контентные меты не заполнены намеренно: фронт должен переживать
    // «некураторскую» категорию (fallback на первые работы по sort_order, спека §1.2).
    title: 'Веб-дизайн',
    description: 'Интерфейсы и лендинги',
    display_variant: 'cards',
    subcategories: [
      {
        title: 'Лендинги',
        works: [
          {
            title: 'Эко-продукты',
            description: 'Лендинг для магазина эко-продуктов.',
            tags: ['Диджитал'],
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
  tags: number
}

/**
 * Идемпотентно наполняет `db` seed-набором: очищает дерево и пересоздаёт его в одной
 * транзакции. Возвращает счётчики созданных сущностей. `key_base` картинок —
 * `images/{workId}/{imageId}` (проставляется после вставки, когда оба id известны).
 */
export function seed(db: Database): SeedSummary {
  const repos = createRepos(db)
  const summary: SeedSummary = { categories: 0, subcategories: 0, works: 0, images: 0, tags: 0 }

  db.transaction(() => {
    // Очистка (idempotency). DELETE FROM category каскадит вниз, но чистим явно сверху вниз
    // для наглядности и независимости от порядка каскадов.
    db.run('DELETE FROM work_tag')
    db.run('DELETE FROM tag')
    db.run('DELETE FROM image')
    db.run('DELETE FROM work')
    db.run('DELETE FROM subcategory')
    db.run('DELETE FROM category')

    // Теги — до работ: работы сразу размечаются созданными id.
    const tagIdByTitle = new Map<string, number>()
    const tagSlugs: string[] = []
    TAGS.forEach((title, tagIndex) => {
      const tagSlug = uniqueSlug(slugify(title), tagSlugs)
      tagSlugs.push(tagSlug)
      const tag = repos.tag.create({ slug: tagSlug, title, sort_order: tagIndex })
      tagIdByTitle.set(title, tag.id)
      summary.tags += 1
    })

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

      // Контентные поля секции — патчем: `create` их не принимает (см. types.ts).
      repos.category.update(category.id, {
        kicker: seedCategory.kicker ?? null,
        meta_role: seedCategory.meta_role ?? null,
        period: seedCategory.period ?? null,
        description_long: seedCategory.description_long ?? null,
        display_variant: seedCategory.display_variant ?? 'showcase',
      })

      // Кураторская витрина категории: собираем по всем её подкатегориям, пишем после обхода.
      const featured: { order: number; workId: number }[] = []
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

          if (seedWork.tags) {
            const tagIds = seedWork.tags.map((title) => {
              const tagId = tagIdByTitle.get(title)
              if (tagId === undefined) throw new Error(`seed: unknown tag "${title}"`)
              return tagId
            })
            repos.tag.setWorkTags(work.id, tagIds)
          }
          if (seedWork.featured !== undefined) {
            featured.push({ order: seedWork.featured, workId: work.id })
          }

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

      if (featured.length > 0) {
        const workIds = featured.sort((a, b) => a.order - b.order).map((entry) => entry.workId)
        repos.work.setFeatured(category.id, workIds)
      }
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
      `${summary.works} works, ${summary.images} images, ${summary.tags} tags → ${config.databasePath}`,
  )
}
