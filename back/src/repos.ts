// Бандл репозиториев задачи 02 — один объект, который удобно прокидывать в роуты, queries
// и seed. Сами репозитории не переписываются, только собираются вместе.

import type { Database } from 'bun:sqlite'
import { createCategoryRepo, type CategoryRepo } from './db/repositories/category.ts'
import { createSubcategoryRepo, type SubcategoryRepo } from './db/repositories/subcategory.ts'
import { createWorkRepo, type WorkRepo } from './db/repositories/work.ts'
import { createImageRepo, type ImageRepo } from './db/repositories/image.ts'

export interface Repos {
  category: CategoryRepo
  subcategory: SubcategoryRepo
  work: WorkRepo
  image: ImageRepo
}

export function createRepos(db: Database): Repos {
  return {
    category: createCategoryRepo(db),
    subcategory: createSubcategoryRepo(db),
    work: createWorkRepo(db),
    image: createImageRepo(db),
  }
}
