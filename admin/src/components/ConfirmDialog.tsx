import { useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface ConfirmDialogProps {
  /** Элемент-триггер (рендерится через asChild — обычно <Button>). */
  trigger: ReactNode
  title: string
  description?: string
  confirmLabel?: string
  /** Подтверждённое действие; диалог закрывается после успешного резолва. */
  onConfirm: () => void | Promise<void>
}

/** Диалог подтверждения деструктивного действия (удаление с каскадом). */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Удалить',
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleConfirm = async () => {
    setBusy(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Отмена
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
