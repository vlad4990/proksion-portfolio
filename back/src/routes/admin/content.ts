// Композит admin-CRUD роутеров (задача 06): категории/подкатегории/работы/картинки/теги/reorder.
// Каждый под-роутер сам вешает guard (401) + CSRF (403) на свои мутации. Монтируется в index.ts
// рядом с adminAuthRoutes (login/logout/me). Снаружи всё это — `/api/admin/*` (Caddy срезает /api).

import { Elysia } from 'elysia'
import type { AdminDeps } from './_shared.ts'
import { adminCategoryRoutes } from './categories.ts'
import { adminSubcategoryRoutes } from './subcategories.ts'
import { adminWorkRoutes } from './works.ts'
import { adminImageRoutes } from './images.ts'
import { adminTagRoutes } from './tags.ts'
import { adminReorderRoutes } from './reorder.ts'

export function adminContentRoutes(deps: AdminDeps) {
  return new Elysia()
    .use(adminReorderRoutes(deps)) // статические /reorder — раньше параметрических /:id
    .use(adminCategoryRoutes(deps))
    .use(adminSubcategoryRoutes(deps))
    .use(adminWorkRoutes(deps))
    .use(adminImageRoutes(deps))
    .use(adminTagRoutes(deps))
}
