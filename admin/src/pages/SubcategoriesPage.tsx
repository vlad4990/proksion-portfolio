import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  createSubcategory,
  deleteSubcategory,
  getCategory,
  reorderSubcategories,
  updateSubcategory,
} from '@/api/content'
import type { SubcategoryNav } from '@/api/types'
import { apiErrorMessage } from '@/lib/errors'
import { useResource } from '@/lib/useResource'
import {
  emptyNamedEntity,
  namedEntityToValues,
  toNamedEntityPayload,
  type NamedEntityValues,
} from '@/forms/schemas'
import { useReorder } from '@/components/useReorder'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { NamedEntityDialog } from '@/components/NamedEntityDialog'
import { ReorderControls } from '@/components/ReorderControls'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function SubcategoriesPage() {
  const { catSlug = '' } = useParams()
  const { data, loading, error, reload } = useResource(
    (signal) => getCategory(catSlug, signal),
    [catSlug],
  )
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<SubcategoryNav | null>(null)

  const category = data
  const subcategories = useMemo(() => category?.subcategories ?? [], [category])
  const { order, getItemProps, moveUp, moveDown } = useReorder(subcategories, async (ids) => {
    try {
      await reorderSubcategories(ids)
    } catch (err) {
      toast.error(apiErrorMessage(err))
      reload()
      throw err
    }
  })

  const handleCreate = async (values: NamedEntityValues) => {
    if (!category) return
    await createSubcategory({ category_id: category.id, ...toNamedEntityPayload(values) })
    toast.success('Подкатегория создана')
    reload()
  }

  const handleEdit = (target: SubcategoryNav) => async (values: NamedEntityValues) => {
    await updateSubcategory(target.id, toNamedEntityPayload(values))
    toast.success('Подкатегория обновлена')
    reload()
  }

  const handleDelete = (target: SubcategoryNav) => async () => {
    try {
      await deleteSubcategory(target.id)
      toast.success('Подкатегория удалена')
      reload()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Категории', to: '/' },
          { label: category?.title ?? catSlug },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold uppercase tracking-wide">
            {category?.title ?? 'Подкатегории'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Разделы внутри категории.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={!category}>
          <Plus />
          Новая подкатегория
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Загрузка…</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {!loading && !error && order.length === 0 && (
        <p className="text-sm text-muted-foreground">Пока нет подкатегорий.</p>
      )}

      {order.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Порядок</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Слаг</TableHead>
              <TableHead className="w-24">Работы</TableHead>
              <TableHead className="w-40 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.map((sub, index) => (
              <TableRow key={sub.id} {...getItemProps(index)}>
                <TableCell>
                  <ReorderControls
                    index={index}
                    isFirst={index === 0}
                    isLast={index === order.length - 1}
                    onMoveUp={moveUp}
                    onMoveDown={moveDown}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <Link
                    to={`/categories/${encodeURIComponent(catSlug)}/${encodeURIComponent(sub.slug)}`}
                    className="hover:underline"
                  >
                    {sub.title}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{sub.slug}</TableCell>
                <TableCell className="text-muted-foreground">{sub.work_count}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Редактировать"
                      onClick={() => setEditTarget(sub)}
                    >
                      <Pencil />
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon" aria-label="Удалить">
                          <Trash2 />
                        </Button>
                      }
                      title={`Удалить «${sub.title}»?`}
                      description="Будут удалены все работы и картинки этой подкатегории."
                      onConfirm={handleDelete(sub)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <NamedEntityDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Новая подкатегория"
        initialValues={emptyNamedEntity}
        onSubmit={handleCreate}
      />
      {editTarget && (
        <NamedEntityDialog
          open
          onOpenChange={(next) => !next && setEditTarget(null)}
          title="Редактировать подкатегорию"
          isEdit
          initialValues={namedEntityToValues(editTarget)}
          onSubmit={handleEdit(editTarget)}
        />
      )}
    </div>
  )
}
