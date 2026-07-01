// Поддержка тестов admin-CRUD (задача 06). Файл НЕ матчится раннером (нет `.test.`) — это хелпер.
// Даёт: in-memory БД + репозитории + AdminDeps с счётчиком мутаций, и фабрики auth-заголовков
// (валидная сессия / CSRF) поверх настоящих jwt/guard из задачи 05.

import { openDb } from '../../db/index.ts'
import { createRepos, type Repos } from '../../repos.ts'
import { signToken } from '../../auth/jwt.ts'
import { AUTH_COOKIE } from '../../auth/guard.ts'
import type { ObjectStore } from '../../storage/s3.ts'
import type { AdminDeps } from './_shared.ts'

export const TEST_SECRET = 'admin-crud-test-secret-0123456789abcdef'

/** Заголовки валидной admin-сессии (+ CSRF-маркер). `extra` переопределяет/добавляет. */
export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = signToken({ sub: 'admin' }, TEST_SECRET, 3600)
  return { cookie: `${AUTH_COOKIE}=${token}`, 'x-requested-with': 'fetch', ...extra }
}

/** Заголовки для JSON-мутации (auth + CSRF + content-type). */
export function jsonHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return authHeaders({ 'content-type': 'application/json', ...extra })
}

/** Request к in-memory приложению. */
export function req(path: string, init: RequestInit = {}): Request {
  return new Request(`http://localhost${path}`, init)
}

export interface TestCtx {
  repos: Repos
  deps: AdminDeps
  /** Сколько раз дёрнулся onMutation(). */
  mutationCount: () => number
}

/** Свежая in-memory БД + AdminDeps. `store` по умолчанию null (CRUD без MinIO). */
export function makeCtx(store: ObjectStore | null = null): TestCtx {
  const db = openDb(':memory:')
  const repos = createRepos(db)
  let mutations = 0
  const deps: AdminDeps = {
    repos,
    store,
    jwtSecret: TEST_SECRET,
    onMutation: () => {
      mutations += 1
    },
  }
  return { repos, deps, mutationCount: () => mutations }
}

/** Фейковое хранилище, у которого заливка всегда падает (для теста атомарности). */
export function failingStore(): ObjectStore {
  return {
    put: () => Promise.reject(new Error('s3 unavailable')),
    exists: () => Promise.resolve(false),
    count: () => Promise.resolve(0),
    delete: () => Promise.resolve(),
    deletePrefix: () => Promise.resolve(0),
  }
}
