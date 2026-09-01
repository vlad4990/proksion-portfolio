import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { apiErrorMessage } from '@/lib/errors'
import { workSchema, type WorkFormValues } from '@/forms/schemas'
import { MarkdownEditor } from '@/components/MarkdownEditor'
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

interface WorkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  initialValues: WorkFormValues
  isEdit?: boolean
  onSubmit: (values: WorkFormValues) => Promise<void>
}

/**
 * Диалог создания/редактирования работы: title (опц.), slug, описание (markdown + превью)
 * и чекбоксы показа: «единое полотно» (лента картинок в модалке без зазоров) и «карусель»
 * (десктопная модалка — горизонтальная карусель вместо вертикальной ленты).
 */
export function WorkDialog({
  open,
  onOpenChange,
  title,
  initialValues,
  isEdit = false,
  onSubmit,
}: WorkDialogProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const form = useForm<WorkFormValues>({
    resolver: zodResolver(workSchema),
    defaultValues: initialValues,
  })

  useEffect(() => {
    if (open) {
      form.reset(initialValues)
      setSubmitError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const submit = async (values: WorkFormValues) => {
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Название необязательно. Слаг генерируется из названия, если не задан.
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
                      ? 'Меняйте осторожно: ссылка на работу изменится.'
                      : 'Можно оставить пустым.'}
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
                    <MarkdownEditor value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="seamless"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-3 space-y-0">
                  <FormControl>
                    {/* Нативный чекбокс: своего Checkbox в ui/ нет, а тянуть новую
                        зависимость под одно поле не нужно. */}
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 shrink-0 accent-foreground"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="font-normal">Единое полотно</FormLabel>
                    <FormDescription>
                      Картинки в модалке идут стык-в-стык, без отступов — для работ,
                      нарезанных из одного макета.
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="carousel"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-3 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 shrink-0 accent-foreground"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="font-normal">Карусель на десктопе</FormLabel>
                    <FormDescription>
                      Вместо вертикальной ленты — горизонтальная карусель картинок
                      (только десктоп, при двух и более картинках). Для работ, где
                      картинки после главной сильно ниже её.
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
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
