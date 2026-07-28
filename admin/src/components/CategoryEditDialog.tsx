// Редактирование категории из СПИСКА категорий. Список (`GET /categories`) не отдаёт
// `description_long` — оно есть только в детали (`GET /categories/:cat`), поэтому диалог
// догружает категорию по слагу и лишь затем показывает форму.
// На странице самой категории деталь уже загружена — там CategoryDialog используется напрямую.

import { toast } from 'sonner'

import { getCategory, updateCategory } from '@/api/content'
import { useResource } from '@/lib/useResource'
import { categoryDetailToValues, toCategoryPatch, type CategoryFormValues } from '@/forms/schemas'
import { CategoryDialog } from '@/components/CategoryDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface CategoryEditDialogProps {
  catSlug: string
  /** Закрыть диалог (отмена или успешное сохранение). */
  onClose: () => void
  /** Успешное сохранение — родителю пора перечитать список. */
  onSaved: () => void
}

export function CategoryEditDialog({ catSlug, onClose, onSaved }: CategoryEditDialogProps) {
  const { data, loading, error } = useResource((signal) => getCategory(catSlug, signal), [catSlug])

  const handleSubmit = async (values: CategoryFormValues) => {
    if (!data) return
    await updateCategory(data.id, toCategoryPatch(values))
    toast.success('Категория обновлена')
    onSaved()
  }

  if (!data) {
    return (
      <Dialog open onOpenChange={(next) => !next && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать категорию</DialogTitle>
            <DialogDescription>
              {loading && 'Загрузка…'}
              {error && <span role="alert">{error}</span>}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <CategoryDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title="Редактировать категорию"
      isEdit
      initialValues={categoryDetailToValues(data)}
      onSubmit={handleSubmit}
    />
  )
}
