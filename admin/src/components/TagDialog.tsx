// Диалог создания/переименования тега. Отдельная форма (а не NamedEntityDialog): у тега нет
// описания, а слаг после создания менять не нужно — он часть публичной ссылки `?tag=<slug>`.

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { apiErrorMessage } from '@/lib/errors'
import { tagSchema, type TagFormValues } from '@/forms/schemas'
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

interface TagDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  initialValues: TagFormValues
  isEdit?: boolean
  /** Сохранение; при отказе бросает (диалог остаётся открытым и показывает ошибку). */
  onSubmit: (values: TagFormValues) => Promise<void>
}

export function TagDialog({
  open,
  onOpenChange,
  title,
  initialValues,
  isEdit = false,
  onSubmit,
}: TagDialogProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: initialValues,
  })

  useEffect(() => {
    if (open) {
      form.reset(initialValues)
      setSubmitError(null)
    }
    // initialValues стабильны на время открытия диалога
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const submit = async (values: TagFormValues) => {
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
            Тег — чип-фильтр на публичной странице «Проекты».
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
                      ? 'Переименование слаг не меняет. Правьте только если готовы сломать ссылки с фильтром.'
                      : 'Можно оставить пустым — будет транслит из названия.'}
                  </FormDescription>
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
