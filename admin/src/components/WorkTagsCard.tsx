// Мультивыбор тегов работы (спека редизайна §7.3): чипы-переключатели по списку `GET /tags`.
// PATCH `/admin/works/:id` заменяет набор ЦЕЛИКОМ, поэтому наружу уходит полный `tag_ids`,
// а не дельта. Выбор локальный до нажатия «Сохранить теги» — случайный клик ничего не пишет.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import type { TagNav } from '@/api/types'
import { sameTagIds, toggleTagId } from '@/lib/tag-selection'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface WorkTagsCardProps {
  tags: TagNav[]
  loading: boolean
  error: string | null
  /** Текущий набор с сервера (`WorkDetail.tag_ids`). */
  value: number[]
  /** Сохранение полного набора; бросает при отказе (выбор остаётся несохранённым). */
  onSave: (tagIds: number[]) => Promise<void>
}

export function WorkTagsCard({ tags, loading, error, value, onSave }: WorkTagsCardProps) {
  const [selected, setSelected] = useState<number[]>(value)
  const [saving, setSaving] = useState(false)

  // Подхватываем серверный набор (первая загрузка и рефетч после сохранения).
  useEffect(() => {
    setSelected(value)
  }, [value])

  const dirty = !sameTagIds(selected, value)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(selected)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Теги</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <p className="text-sm text-muted-foreground">Загрузка тегов…</p>}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {!loading && !error && tags.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Тегов пока нет. Создайте их на экране{' '}
            <Link to="/tags" className="underline">
              «Теги»
            </Link>
            .
          </p>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const active = selected.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelected((prev) => toggleTagId(prev, tag.id))}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tag.title}
                </button>
              )
            })}
          </div>
        )}
        {tags.length > 0 && (
          <div className="flex items-center gap-3">
            <Button type="button" size="sm" disabled={!dirty || saving} onClick={handleSave}>
              Сохранить теги
            </Button>
            {dirty && <span className="text-sm text-muted-foreground">Есть несохранённые изменения</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
