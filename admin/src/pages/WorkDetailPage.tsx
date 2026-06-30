import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'

import {
  getWorkDetail,
  reorderImages,
  updateImage,
  updateWork,
  deleteImage,
} from '@/api/content'
import { apiErrorMessage } from '@/lib/errors'
import { renderMarkdown } from '@/lib/markdown'
import { useResource } from '@/lib/useResource'
import { toWorkPatch, workDetailToValues, type WorkFormValues } from '@/forms/schemas'
import { useWorkRegistry } from '@/content/work-registry'
import { useReorder } from '@/components/useReorder'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ImageCard } from '@/components/ImageCard'
import { ImageUploader } from '@/components/ImageUploader'
import { WorkDialog } from '@/components/WorkDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function WorkDetailPage() {
  const { catSlug = '', subSlug = '', workSlug = '' } = useParams()
  const { remember } = useWorkRegistry()
  const { data, loading, error, reload } = useResource(
    (signal) => getWorkDetail(catSlug, subSlug, workSlug, signal),
    [catSlug, subSlug, workSlug],
  )
  const [editOpen, setEditOpen] = useState(false)

  // Запоминаем работу в реестре (slug/title) — чтобы список работ мог её открыть/показать.
  // remember стабилен (useCallback), mergeKnown идемпотентен → без циклов ре-рендера.
  useEffect(() => {
    if (data) {
      remember({ id: data.id, catSlug, subSlug, slug: data.slug, title: data.title })
    }
  }, [data, remember, catSlug, subSlug])

  const images = useMemo(() => data?.images ?? [], [data])
  const { order, getItemProps, moveUp, moveDown } = useReorder(images, async (ids) => {
    try {
      await reorderImages(ids)
    } catch (err) {
      toast.error(apiErrorMessage(err))
      reload()
      throw err
    }
  })

  const handleEditWork = async (values: WorkFormValues) => {
    if (!data) return
    await updateWork(data.id, toWorkPatch(values))
    toast.success('Работа обновлена')
    reload()
  }

  const handleSetCover = async (imageId: number) => {
    if (!data) return
    try {
      await updateWork(data.id, { cover_image_id: imageId })
      toast.success('Обложка обновлена')
      reload()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  const handleSaveAlt = async (imageId: number, alt: string) => {
    try {
      await updateImage(imageId, { alt: alt.trim() === '' ? null : alt })
      toast.success('Alt сохранён')
      reload()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  const handleDeleteImage = async (imageId: number) => {
    try {
      await deleteImage(imageId)
      toast.success('Картинка удалена')
      reload()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  const descriptionHtml = data?.description ? renderMarkdown(data.description) : ''

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Категории', to: '/' },
          { label: catSlug, to: `/categories/${encodeURIComponent(catSlug)}` },
          {
            label: subSlug,
            to: `/categories/${encodeURIComponent(catSlug)}/${encodeURIComponent(subSlug)}`,
          },
          { label: data?.title || workSlug },
        ]}
      />

      {loading && <p className="text-sm text-muted-foreground">Загрузка…</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {data && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold uppercase tracking-wide">
                {data.title || 'Без названия'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">Слаг: {data.slug}</p>
            </div>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil />
              Редактировать
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Описание</CardTitle>
            </CardHeader>
            <CardContent>
              {descriptionHtml ? (
                <div
                  className="text-sm [&_a]:underline [&_h1]:text-base [&_h1]:font-semibold [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Описание не задано.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Картинки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImageUploader workId={data.id} onSettled={reload} />
              {order.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Пока нет картинок. Загрузите — первая станет обложкой.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {order.map((image, index) => (
                    <ImageCard
                      key={image.id}
                      image={image}
                      index={index}
                      isFirst={index === 0}
                      isLast={index === order.length - 1}
                      isCover={data.cover_image_id === image.id}
                      dragProps={getItemProps(index)}
                      onMoveUp={moveUp}
                      onMoveDown={moveDown}
                      onSetCover={handleSetCover}
                      onSaveAlt={handleSaveAlt}
                      onDelete={handleDeleteImage}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <WorkDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            title="Редактировать работу"
            isEdit
            initialValues={workDetailToValues(data)}
            onSubmit={handleEditWork}
          />
        </>
      )}
    </div>
  )
}
