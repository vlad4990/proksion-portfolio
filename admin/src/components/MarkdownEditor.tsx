import { useState } from 'react'

import { renderMarkdown } from '@/lib/markdown'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
  rows?: number
}

/**
 * Лёгкий редактор описания: textarea (markdown) + переключаемое превью (docs/architecture.md §7).
 * Без тяжёлых редакторов — рендер через безопасный renderMarkdown.
 */
export function MarkdownEditor({
  value,
  onChange,
  id,
  placeholder,
  rows = 6,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const html = renderMarkdown(value)

  return (
    <div className="space-y-2">
      <div className="flex gap-1" role="tablist" aria-label="Режим описания">
        <Button
          type="button"
          size="sm"
          variant={mode === 'write' ? 'secondary' : 'ghost'}
          role="tab"
          aria-selected={mode === 'write'}
          onClick={() => setMode('write')}
        >
          Markdown
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'preview' ? 'secondary' : 'ghost'}
          role="tab"
          aria-selected={mode === 'preview'}
          onClick={() => setMode('preview')}
        >
          Превью
        </Button>
      </div>

      {mode === 'write' ? (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'Описание работы (поддерживается markdown)'}
          rows={rows}
        />
      ) : (
        <div
          data-testid="markdown-preview"
          className={cn(
            'min-h-20 rounded-md border border-input px-3 py-2 text-sm',
            '[&_a]:underline [&_h1]:text-base [&_h1]:font-semibold [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5',
          )}
        >
          {html ? (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <p className="text-muted-foreground">Нечего показать</p>
          )}
        </div>
      )}
    </div>
  )
}
