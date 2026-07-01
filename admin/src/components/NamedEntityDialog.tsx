import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { apiErrorMessage } from '@/lib/errors'
import { namedEntitySchema, type NamedEntityValues } from '@/forms/schemas'
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
import { Textarea } from '@/components/ui/textarea'

interface NamedEntityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  initialValues: NamedEntityValues
  /** true для редактирования — показываем подсказку о стабильности слага. */
  isEdit?: boolean
  /** Сохранение; при отказе бросает (диалог остаётся открытым и показывает ошибку). */
  onSubmit: (values: NamedEntityValues) => Promise<void>
}

/** Диалог создания/редактирования именованной сущности (категория/подкатегория). */
export function NamedEntityDialog({
  open,
  onOpenChange,
  title,
  description,
  initialValues,
  isEdit = false,
  onSubmit,
}: NamedEntityDialogProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const form = useForm<NamedEntityValues>({
    resolver: zodResolver(namedEntitySchema),
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

  const submit = async (values: NamedEntityValues) => {
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
          {description && <DialogDescription>{description}</DialogDescription>}
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
