import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  createCategory,
  deleteCategory,
  getCategories,
  reorderCategories,
  updateCategory,
} from '@/api/content'
import type { CategoryNav } from '@/api/types'
import { apiErrorMessage } from '@/lib/errors'
import { useResource } from '@/lib/useResource'
import {
  emptyNamedEntity,
  namedEntityToValues,
  toCategoryInput,
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

export default function CategoriesPage() {
  const { data, loading, error, reload } = useResource((signal) => getCategories(signal), [])
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CategoryNav | null>(null)

  const categories = useMemo(() => data ?? [], [data])
  const { order, getItemProps, moveUp, moveDown } = useReorder(categories, async (ids) => {
    try {
      await reorderCategories(ids)
    } catch (err) {
      toast.error(apiErrorMessage(err))
      reload()
      throw err
    }
  })

  const handleCreate = async (values: NamedEntityValues) => {
    await createCategory(toCategoryInput(values))
    toast.success('Категория создана')
    reload()
  }

  const handleEdit = (target: CategoryNav) => async (values: NamedEntityValues) => {
    await updateCategory(target.id, toCategoryInput(values))
    toast.success('Категория обновлена')
    reload()
  }

  const handleDelete = (target: CategoryNav) => async () => {
    try {
      await deleteCategory(target.id)
      toast.success('Категория удалена')
      reload()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Категории' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold uppercase tracking-wide">Категории</h1>
          <p className="mt-1 text-sm text-muted-foreground">Проекты портфолио.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Новая категория
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Загрузка…</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {!loading && !error && order.length === 0 && (
        <p className="text-sm text-muted-foreground">Пока нет категорий. Создайте первую.</p>
      )}

      {order.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Порядок</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Слаг</TableHead>
              <TableHead className="w-32">Подкатегории</TableHead>
              <TableHead className="w-40 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.map((cat, index) => (
              <TableRow key={cat.id} {...getItemProps(index)}>
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
                  <Link to={`/categories/${encodeURIComponent(cat.slug)}`} className="hover:underline">
                    {cat.title}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{cat.slug}</TableCell>
                <TableCell className="text-muted-foreground">{cat.subcategories.length}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Редактировать"
                      onClick={() => setEditTarget(cat)}
                    >
                      <Pencil />
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon" aria-label="Удалить">
                          <Trash2 />
                        </Button>
                      }
                      title={`Удалить «${cat.title}»?`}
                      description="Будут удалены все подкатегории, работы и картинки этой категории."
                      onConfirm={handleDelete(cat)}
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
        title="Новая категория"
        initialValues={emptyNamedEntity}
        onSubmit={handleCreate}
      />
      {editTarget && (
        <NamedEntityDialog
          open
          onOpenChange={(next) => !next && setEditTarget(null)}
          title="Редактировать категорию"
          isEdit
          initialValues={namedEntityToValues(editTarget)}
          onSubmit={handleEdit(editTarget)}
        />
      )}
    </div>
  )
}
