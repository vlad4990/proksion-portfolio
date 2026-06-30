import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export interface Crumb {
  label: string
  to?: string
}

/** Хлебные крошки навигации по дереву контента. Последний элемент — без ссылки (текущий). */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Навигация" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      {items.map((crumb, i) => (
        <Fragment key={i}>
          {i > 0 && <ChevronRight className="size-3.5" aria-hidden="true" />}
          {crumb.to ? (
            <Link to={crumb.to} className="hover:text-foreground hover:underline">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-foreground">{crumb.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
