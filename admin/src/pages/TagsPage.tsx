// Экран «Теги» (спека редизайна §7.2): глобальный справочник тегов-фильтров корневой
// `/projects`. Список читается публичным `GET /tags` (там же счётчик видимых работ),
// мутации — admin-CRUD задачи 15. Порядок — тот же reorder-механизм, что у категорий.

import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { createTag, deleteTag, getTags, reorderTags, updateTag } from '@/api/content'
import type { TagNav } from '@/api/types'
import { apiErrorMessage } from '@/lib/errors'
import { useResource } from '@/lib/useResource'
import { emptyTag, tagToValues, toTagInput, toTagPatch, type TagFormValues } from '@/forms/schemas'
import { useReorder } from '@/components/useReorder'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ReorderControls } from '@/components/ReorderControls'
import { TagDialog } from '@/components/TagDialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function TagsPage() {
  const { data, loading, error, reload } = useResource((signal) => getTags(signal), [])
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<TagNav | null>(null)

  const tags = useMemo(() => data ?? [], [data])
  const { order, getItemProps, moveUp, moveDown } = useReorder(tags, async (ids) => {
    try {
      await reorderTags(ids)
    } catch (err) {
      toast.error(apiErrorMessage(err))
      reload()
      throw err // без throw useReorder не откатит оптимистичный порядок
    }
  })

  const handleCreate = async (values: TagFormValues) => {
    const tag = await createTag(toTagInput(values))
    toast.success(`Тег создан (слаг: ${tag.slug})`)
    reload()
  }

  const handleEdit = (target: TagNav) => async (values: TagFormValues) => {
    await updateTag(target.id, toTagPatch(values, target.slug))
    toast.success('Тег обновлён')
    reload()
  }

  const handleDelete = (target: TagNav) => async () => {
    try {
      await deleteTag(target.id)
      toast.success('Тег удалён')
      reload()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Теги' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold uppercase tracking-wide">Теги</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Чипы-фильтры на странице «Проекты». Порядок в таблице = порядок чипов на сайте.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Новый тег
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Загрузка…</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {!loading && !error && order.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Пока нет тегов. Пока список пуст, чипы-фильтры на сайте не показываются.
        </p>
      )}

      {order.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Порядок</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Слаг</TableHead>
              <TableHead className="w-40">Работ с картинками</TableHead>
              <TableHead className="w-40 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.map((tag, index) => (
              <TableRow key={tag.id} {...getItemProps(index)}>
                <TableCell>
                  <ReorderControls
                    index={index}
                    isFirst={index === 0}
                    isLast={index === order.length - 1}
                    onMoveUp={moveUp}
                    onMoveDown={moveDown}
                  />
                </TableCell>
                <TableCell className="font-medium">{tag.title}</TableCell>
                <TableCell className="text-muted-foreground">{tag.slug}</TableCell>
                <TableCell className="text-muted-foreground">{tag.work_count}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Редактировать"
                      onClick={() => setEditTarget(tag)}
                    >
                      <Pencil />
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon" aria-label="Удалить">
                          <Trash2 />
                        </Button>
                      }
                      title={`Удалить тег «${tag.title}»?`}
                      description="Тег снимется со всех работ и исчезнет из фильтров сайта. Сами работы останутся."
                      onConfirm={handleDelete(tag)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <TagDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Новый тег"
        initialValues={emptyTag}
        onSubmit={handleCreate}
      />
      {editTarget && (
        <TagDialog
          open
          onOpenChange={(next) => !next && setEditTarget(null)}
          title="Редактировать тег"
          isEdit
          initialValues={tagToValues(editTarget)}
          onSubmit={handleEdit(editTarget)}
        />
      )}
    </div>
  )
}
