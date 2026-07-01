import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface ReorderControlsProps {
  index: number
  isFirst: boolean
  isLast: boolean
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
}

/**
 * Доступная альтернатива/дополнение к drag-n-drop: рукоятка (для перетаскивания мышью —
 * DnD-пропсы навешивает родитель) + кнопки вверх/вниз (клавиатура/без мыши). Обе ветки
 * ведут к одному reorder-пайплайну (useReorder).
 */
export function ReorderControls({
  index,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: ReorderControlsProps) {
  return (
    <div className="flex items-center gap-0.5">
      <GripVertical
        className="size-4 cursor-grab text-muted-foreground"
        aria-hidden="true"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={isFirst}
        aria-label="Переместить выше"
        onClick={() => onMoveUp(index)}
      >
        <ChevronUp />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={isLast}
        aria-label="Переместить ниже"
        onClick={() => onMoveDown(index)}
      >
        <ChevronDown />
      </Button>
    </div>
  )
}
