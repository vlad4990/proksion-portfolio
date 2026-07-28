// CRUD глобальных тегов (задача 15, спека редизайна §5.5). Слаг уникален ГЛОБАЛЬНО:
// автогенерация из title получает суффикс, а явно заданный занятый слаг — 400
// (пользователь просил конкретный слаг, молча подменять его нельзя).

import { beforeEach, describe, expect, test } from 'bun:test'
import { adminTagRoutes } from './tags.ts'
import { authHeaders, jsonHeaders, makeCtx, req, type TestCtx } from './_support.ts'

describe('admin tags CRUD', () => {
  let ctx: TestCtx
  let app: ReturnType<typeof adminTagRoutes>

  beforeEach(() => {
    ctx = makeCtx()
    app = adminTagRoutes(ctx.deps)
  })

  const post = (body: unknown, headers = jsonHeaders()) =>
    app.handle(req('/admin/tags', { method: 'POST', headers, body: JSON.stringify(body) }))

  const patch = (id: number | string, body: unknown, headers = jsonHeaders()) =>
    app.handle(req(`/admin/tags/${id}`, { method: 'PATCH', headers, body: JSON.stringify(body) }))

  const del = (id: number | string, headers = authHeaders()) =>
    app.handle(req(`/admin/tags/${id}`, { method: 'DELETE', headers }))

  test('POST creates a tag with an auto slug transliterated from the russian title', async () => {
    const res = await post({ title: 'Айдентика' })
    expect(res.status).toBe(201)
    const row = (await res.json()) as { id: number; slug: string; title: string; sort_order: number }
    expect(row.title).toBe('Айдентика')
    expect(row.slug).toBe('aydentika')
    expect(row.sort_order).toBe(0)
    expect(ctx.mutationCount()).toBe(1)
  })

  test('an explicit slug is honoured (slugified, no suffix)', async () => {
    const row = (await (await post({ title: 'Тест', slug: 'Motion Design' })).json()) as {
      slug: string
    }
    expect(row.slug).toBe('motion-design')
  })

  test('duplicate titles get a unique slug suffix', async () => {
    const a = (await (await post({ title: 'Постер' })).json()) as { slug: string }
    const b = (await (await post({ title: 'Постер' })).json()) as { slug: string }
    expect(a.slug).toBe('poster')
    expect(b.slug).toBe('poster-2')
  })

  test('an explicit slug that is already taken → 400, nothing created', async () => {
    await post({ title: 'Первый', slug: 'branding' })
    const res = await post({ title: 'Второй', slug: 'branding' })
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: string }).error).toBe('bad_request')
    expect(ctx.repos.tag.list()).toHaveLength(1)
    expect(ctx.mutationCount()).toBe(1) // 4xx не считается мутацией
  })

  test('POST without a title → 400', async () => {
    expect((await post({})).status).toBe(400)
    expect(ctx.mutationCount()).toBe(0)
  })

  test('sort_order defaults to the end of the list', async () => {
    const a = (await (await post({ title: 'A' })).json()) as { sort_order: number }
    const b = (await (await post({ title: 'B' })).json()) as { sort_order: number }
    expect(a.sort_order).toBe(0)
    expect(b.sort_order).toBe(1)
  })

  test('explicit sort_order is honoured', async () => {
    const row = (await (await post({ title: 'A', sort_order: 7 })).json()) as { sort_order: number }
    expect(row.sort_order).toBe(7)
  })

  test('PATCH edits the title but keeps the slug stable', async () => {
    const created = (await (await post({ title: 'Старое' })).json()) as { id: number; slug: string }
    const res = await patch(created.id, { title: 'Новое' })
    expect(res.status).toBe(200)
    const row = (await res.json()) as { title: string; slug: string }
    expect(row.title).toBe('Новое')
    expect(row.slug).toBe(created.slug)
  })

  test('PATCH with an explicit slug changes it', async () => {
    const created = (await (await post({ title: 'X' })).json()) as { id: number }
    const row = (await (await patch(created.id, { slug: 'переименовано' })).json()) as {
      slug: string
    }
    expect(row.slug).toBe('pereimenovano')
    expect(ctx.mutationCount()).toBe(2)
  })

  test('PATCH keeping its own slug is a no-op, not a conflict', async () => {
    const created = (await (await post({ title: 'Айдентика' })).json()) as {
      id: number
      slug: string
    }
    const res = await patch(created.id, { slug: created.slug, title: 'Айдентика 2' })
    expect(res.status).toBe(200)
    expect(((await res.json()) as { slug: string }).slug).toBe(created.slug)
  })

  test('PATCH to a slug taken by another tag → 400, tag untouched', async () => {
    const a = (await (await post({ title: 'Первый', slug: 'branding' })).json()) as { id: number }
    const b = (await (await post({ title: 'Второй', slug: 'motion' })).json()) as { id: number }
    const res = await patch(b.id, { slug: 'branding' })
    expect(res.status).toBe(400)
    expect(ctx.repos.tag.getById(b.id)?.slug).toBe('motion')
    expect(ctx.repos.tag.getById(a.id)?.slug).toBe('branding')
    expect(ctx.mutationCount()).toBe(2) // только два POST
  })

  test('PATCH sort_order', async () => {
    const created = (await (await post({ title: 'A' })).json()) as { id: number }
    const row = (await (await patch(created.id, { sort_order: 5 })).json()) as { sort_order: number }
    expect(row.sort_order).toBe(5)
  })

  test('PATCH unknown id → 404', async () => {
    const res = await patch(999, { title: 'x' })
    expect(res.status).toBe(404)
    expect(((await res.json()) as { error: string }).error).toBe('not_found')
    expect(ctx.mutationCount()).toBe(0)
  })

  test('DELETE removes the tag and cascades work_tag links', async () => {
    const tag = (await (await post({ title: 'Айдентика' })).json()) as { id: number }
    const cat = ctx.repos.category.create({ slug: 'c', title: 'C' })
    const sub = ctx.repos.subcategory.create({ category_id: cat.id, slug: 's', title: 'S' })
    const work = ctx.repos.work.create({ subcategory_id: sub.id, slug: 'w', title: 'W' })
    ctx.repos.tag.setWorkTags(work.id, [tag.id])
    expect(ctx.repos.tag.listTagIdsByWork(work.id)).toEqual([tag.id])

    const res = await del(tag.id)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(ctx.repos.tag.getById(tag.id)).toBeNull()
    expect(ctx.repos.tag.listTagIdsByWork(work.id)).toEqual([]) // work_tag ушёл каскадом
    expect(ctx.repos.work.getById(work.id)).not.toBeNull() // сама работа цела
  })

  test('DELETE unknown id → 404', async () => {
    const res = await del(999)
    expect(res.status).toBe(404)
    expect(ctx.mutationCount()).toBe(0)
  })

  test('invalid id in the path → 400', async () => {
    expect((await patch('abc', { title: 'x' })).status).toBe(400)
  })
})
