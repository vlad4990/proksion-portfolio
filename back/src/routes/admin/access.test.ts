// Контроль доступа ко ВСЕМ admin-CRUD роутерам (verify.md): без сессии → 401; валидная сессия,
// но без CSRF-заголовка → 403. Проверяем по одному репрезентативному эндпоинту на роутер.

import { describe, expect, test } from 'bun:test'
import { adminContentRoutes } from './content.ts'
import { signToken } from '../../auth/jwt.ts'
import { AUTH_COOKIE } from '../../auth/guard.ts'
import { makeCtx, req, TEST_SECRET } from './_support.ts'

const app = adminContentRoutes(makeCtx().deps)
const cookie = `${AUTH_COOKIE}=${signToken({ sub: 'admin' }, TEST_SECRET, 3600)}`

const ENDPOINTS: ReadonlyArray<{ method: string; path: string }> = [
  { method: 'POST', path: '/admin/categories' },
  { method: 'POST', path: '/admin/subcategories' },
  { method: 'POST', path: '/admin/works' },
  { method: 'POST', path: '/admin/works/1/images' },
  { method: 'PATCH', path: '/admin/images/1' },
  { method: 'PATCH', path: '/admin/categories/reorder' },
  // Мутации редизайна (задача 15): контент секции и теги работы едут в существующих PATCH'ах
  { method: 'PATCH', path: '/admin/categories/1' },
  { method: 'PATCH', path: '/admin/works/1' },
  { method: 'POST', path: '/admin/tags' },
  { method: 'PATCH', path: '/admin/tags/1' },
  { method: 'DELETE', path: '/admin/tags/1' },
  { method: 'PATCH', path: '/admin/tags/reorder' },
  { method: 'PATCH', path: '/admin/categories/1/featured' },
]

describe('admin CRUD access control', () => {
  for (const { method, path } of ENDPOINTS) {
    test(`${method} ${path} → 401 without a session`, async () => {
      const res = await app.handle(req(path, { method, headers: { 'x-requested-with': 'fetch' } }))
      expect(res.status).toBe(401)
    })

    test(`${method} ${path} → 403 with a session but no CSRF header`, async () => {
      const res = await app.handle(req(path, { method, headers: { cookie } }))
      expect(res.status).toBe(403)
    })
  }
})
