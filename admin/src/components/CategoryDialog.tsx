// Форма категории: базовые поля + КОНТЕНТ секции/страницы раздела (спека редизайна §7.1).
// Отдельный диалог, а не расширение NamedEntityDialog: та форма общая с подкатегориями, и
// контентные поля категории туда протекать не должны.
//
// Контентный блок показывается только при редактировании: POST /admin/categories принимает
// лишь title/slug/description (back/src/routes/admin/categories.ts), меты — PATCH'ем.

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { apiErrorMessage } from '@/lib/errors'
import {
  categorySchema,
  DISPLAY_VARIANTS,
  DISPLAY_VARIANT_LABELS,
  type CategoryFormValues,
} from '@/forms/schemas'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  initialValues: CategoryFormValues
  /** true — редактирование: доступен блок контента раздела и подсказка о слаге. */
  isEdit?: boolean
  /** Сохранение; при отказе бросает (диалог остаётся открытым и показывает ошибку). */
  onSubmit: (values: CategoryFormValues) => Promise<void>
}

export function CategoryDialog({
  open,
  onOpenChange,
  title,
  initialValues,
  isEdit = false,
  onSubmit,
}: CategoryDialogProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: initialValues,
  })

  // Сброс формы при каждом открытии (предзаполнение при edit, очистка при create).
  useEffect(() => {
    if (open) {
      form.reset(initialValues)
      setSubmitError(null)
    }
    // initialValues стабильны на время открытия диалога
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const submit = async (values: CategoryFormValues) => {
    setSubmitError(null)
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (err) {
      setSubmitError(apiErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Название, слаг и тексты раздела на публичном сайте.'
              : 'Тексты раздела (кикер, роль, период, описание) заполняются после создания.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Слаг</FormLabel>
                  <FormControl>
                    <Input placeholder="генерируется из названия" {...field} />
                  </FormControl>
                  <FormDescription>
                    {isEdit
                      ? 'Слаг — часть ссылки. Меняйте осторожно: старые ссылки сломаются.'
                      : 'Можно оставить пустым — будет транслит из названия.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEdit && (
              <fieldset className="space-y-4 rounded-md border p-4">
                <legend className="px-1 text-sm font-medium">Контент раздела</legend>
                <FormField
                  control={form.control}
                  name="kicker"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Кикер</FormLabel>
                      <FormControl>
                        <Input placeholder="КОММЕРЧЕСКАЯ ГРАФИКА" {...field} />
                      </FormControl>
                      <FormDescription>
                        Надпись над заголовком секции. Пусто — не показывается.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="meta_role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Роль</FormLabel>
                      <FormControl>
                        <Input placeholder="SMM · ПРОМО-ГРАФИКА" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Период</FormLabel>
                      <FormControl>
                        <Input placeholder="2023 — 2026" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description_long"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Длинное описание</FormLabel>
                      <FormControl>
                        <Textarea rows={5} {...field} />
                      </FormControl>
                      <FormDescription>Текст на странице раздела под заголовком.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="display_variant"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Вариант секции</FormLabel>
                      <FormControl>
                        <Select {...field}>
                          {DISPLAY_VARIANTS.map((variant) => (
                            <option key={variant} value={variant}>
                              {DISPLAY_VARIANT_LABELS[variant]}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                      <FormDescription>Как раздел выглядит на странице «Проекты».</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </fieldset>
            )}

            {submitError && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {submitError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Сохранить
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
