import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ImageIcon, Plus, Settings2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { createWork, deleteWork, getSubcategoryListing, reorderWorks } from '@/api/content'
import { apiErrorMessage } from '@/lib/errors'
import { useResource } from '@/lib/useResource'
import { buildWorksView } from '@/lib/works-view'
import { emptyWork, toWorkInput, type WorkFormValues } from '@/forms/schemas'
import { useWorkRegistry } from '@/content/work-registry'
import { useReorder } from '@/components/useReorder'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { WorkDialog } from '@/components/WorkDialog'
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

export default function WorksPage() {
  const { catSlug = '', subSlug = '' } = useParams()
  const navigate = useNavigate()
  const registry = useWorkRegistry()
  const { data, loading, error, reload } = useResource(
    (signal) => getSubcategoryListing(catSlug, subSlug, signal),
    [catSlug, subSlug],
  )
  const [createOpen, setCreateOpen] = useState(false)

  const subcategoryId = data?.subcategory.id ?? null
  // Считаем из стабильного реестра-объекта (а не из нового массива каждый рендер), иначе
  // useReorder сбрасывал бы порядок на каждый рендер.
  const known = registry.known
  const rows = useMemo(() => {
    const list = Object.values(known).filter((w) => w.catSlug === catSlug && w.subSlug === subSlug)
    return buildWorksView(data?.works ?? [], list)
  }, [data, known, catSlug, subSlug])

  const { order, getItemProps, moveUp, moveDown } = useReorder(rows, async (ids) => {
    try {
      await reorderWorks(ids)
    } catch (err) {
      toast.error(apiErrorMessage(err))
      reload()
      throw err
    }
  })

  const workPath = (slug: string) =>
    `/categories/${encodeURIComponent(catSlug)}/${encodeURIComponent(subSlug)}/${encodeURIComponent(slug)}`

  const handleCreate = async (values: WorkFormValues) => {
    if (subcategoryId === null) return
    const work = await createWork(toWorkInput(values, subcategoryId))
    registry.remember({
      id: work.id,
      catSlug,
      subSlug,
      slug: work.slug,
      title: work.title,
    })
    toast.success(`Работа создана (слаг: ${work.slug})`)
    // Сразу в карточку работы — добавить картинки/описание/cover.
    navigate(workPath(work.slug))
  }

  const handleDelete = (id: number) => async () => {
    try {
      await deleteWork(id)
      registry.forget(id)
      toast.success('Работа удалена')
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
          { label: data?.category.title ?? catSlug, to: `/categories/${encodeURIComponent(catSlug)}` },
          { label: data?.subcategory.title ?? subSlug },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold uppercase tracking-wide">
            {data?.subcategory.title ?? 'Работы'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Кликабельные работы подкатегории. Внутри работы — описание и картинки.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={subcategoryId === null}>
          <Plus />
          Новая работа
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
          Пока нет работ. Создайте работу и загрузите в неё картинки.
        </p>
      )}

      {order.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Порядок</TableHead>
              <TableHead className="w-20">Обложка</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Слаг</TableHead>
              <TableHead className="w-44 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.map((row, index) => (
              <TableRow key={row.id} {...getItemProps(index)}>
                <TableCell>
                  <ReorderControls
                    index={index}
                    isFirst={index === 0}
                    isLast={index === order.length - 1}
                    onMoveUp={moveUp}
                    onMoveDown={moveDown}
                  />
                </TableCell>
                <TableCell>
                  {row.cover ? (
                    <img
                      src={row.cover}
                      alt=""
                      className="size-12 rounded object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="grid size-12 place-items-center rounded bg-muted text-muted-foreground">
                      <ImageIcon className="size-4" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {row.slug ? (
                    <Link to={workPath(row.slug)} className="hover:underline">
                      {row.title || 'Без названия'}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">{row.title || `Работа #${row.id}`}</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{row.slug ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {row.slug ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link to={workPath(row.slug)}>
                          <Settings2 />
                          Управление
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        title="Открыть нельзя: у работы неизвестен слаг"
                      >
                        <Settings2 />
                        Управление
                      </Button>
                    )}
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon" aria-label="Удалить">
                          <Trash2 />
                        </Button>
                      }
                      title="Удалить работу?"
                      description="Будут удалены все картинки работы (включая объекты в хранилище)."
                      onConfirm={handleDelete(row.id)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <WorkDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Новая работа"
        initialValues={emptyWork}
        onSubmit={handleCreate}
      />
    </div>
  )
}
