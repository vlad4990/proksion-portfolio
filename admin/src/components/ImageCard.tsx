import { useEffect, useState } from 'react'
import { Star, Trash2 } from 'lucide-react'

import type { ImageDetail } from '@/api/types'
import { cn } from '@/lib/utils'
import type { DragItemProps } from '@/components/useReorder'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ReorderControls } from '@/components/ReorderControls'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ImageCardProps {
  image: ImageDetail
  index: number
  isFirst: boolean
  isLast: boolean
  isCover: boolean
  dragProps: DragItemProps
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onSetCover: (id: number) => Promise<void>
  onSaveAlt: (id: number, alt: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

/** Карточка управления одной картинкой работы: cover/alt/удаление/порядок. */
export function ImageCard({
  image,
  index,
  isFirst,
  isLast,
  isCover,
  dragProps,
  onMoveUp,
  onMoveDown,
  onSetCover,
  onSaveAlt,
  onDelete,
}: ImageCardProps) {
  const [alt, setAlt] = useState(image.alt ?? '')
  const [savingAlt, setSavingAlt] = useState(false)

  // Подхватываем серверное значение alt после рефетча.
  useEffect(() => {
    setAlt(image.alt ?? '')
  }, [image.alt])

  const altDirty = alt !== (image.alt ?? '')

  const saveAlt = async () => {
    setSavingAlt(true)
    try {
      await onSaveAlt(image.id, alt)
    } finally {
      setSavingAlt(false)
    }
  }

  return (
    <div
      {...dragProps}
      className={cn(
        'flex flex-col gap-3 rounded-lg border p-3',
        isCover && 'ring-2 ring-primary',
      )}
    >
      <div className="flex items-start gap-3">
        <img
          src={image.variants.thumb.jpg}
          alt={image.alt ?? ''}
          className="size-24 shrink-0 rounded object-cover"
          loading="lazy"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            {isCover ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                <Star className="size-3.5 fill-current" />
                Обложка
              </span>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => void onSetCover(image.id)}
              >
                <Star />
                Сделать обложкой
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {image.w}×{image.h}px
          </p>
        </div>
        <ReorderControls
          index={index}
          isFirst={isFirst}
          isLast={isLast}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor={`alt-${image.id}`} className="text-xs">
          Alt-текст
        </Label>
        <div className="flex gap-2">
          <Input
            id={`alt-${image.id}`}
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Описание картинки"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!altDirty || savingAlt}
            onClick={saveAlt}
          >
            Сохранить
          </Button>
        </div>
      </div>

      <ConfirmDialog
        trigger={
          <Button type="button" variant="ghost" size="sm" className="self-start text-destructive">
            <Trash2 />
            Удалить картинку
          </Button>
        }
        title="Удалить картинку?"
        description="Объекты будут удалены из хранилища. Если это обложка — она переназначится."
        onConfirm={() => onDelete(image.id)}
      />
    </div>
  )
}
