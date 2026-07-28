// Блок «Витрина раздела» на странице категории (спека редизайна §7.4).
//
// Состояние витрины читается публичным `GET /featured`: `curated: false` = витрина НЕ настроена
// (бэк отдал fallback — первые работы раздела), поэтому такой список показываем как пустой.
// Кандидаты — `GET /works?category=` (только ВИДИМЫЕ работы: без картинок работа на сайт не
// попадает, значит и в витрину её ставить нельзя).
//
// Любое действие (добавить/убрать/переставить/очистить) сохраняется одним
// PATCH `…/featured {work_ids}` — порядок массива и есть витрина, нулевой элемент = hero-тайл.

import { useMemo, useState } from 'react'
import { ImageIcon, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

import { getFeatured, getWorksByCategory, setCategoryFeatured } from '@/api/content'
import { apiErrorMessage } from '@/lib/errors'
import { useResource } from '@/lib/useResource'
import { curatedWorks, featuredCandidates, sectionForCategory, withoutWork, withWork } from '@/lib/featured'
import { useReorder } from '@/components/useReorder'
import { ReorderControls } from '@/components/ReorderControls'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface FeaturedEditorProps {
  categoryId: number
  catSlug: string
}

const workLabel = (work: { id: number; title: string | null }): string =>
  work.title || `Работа #${work.id}`

function Thumb({ src, alt }: { src: string | null; alt: string }) {
  return src ? (
    <img src={src} alt={alt} className="size-12 shrink-0 rounded object-cover" loading="lazy" />
  ) : (
    <div className="grid size-12 shrink-0 place-items-center rounded bg-muted text-muted-foreground">
      <ImageIcon className="size-4" />
    </div>
  )
}

export function FeaturedEditor({ categoryId, catSlug }: FeaturedEditorProps) {
  const featured = useResource((signal) => getFeatured(signal), [catSlug])
  const works = useResource((signal) => getWorksByCategory(catSlug, signal), [catSlug])
  const [busy, setBusy] = useState(false)

  const section = useMemo(
    () => sectionForCategory(featured.data ?? [], catSlug),
    [featured.data, catSlug],
  )
  // useReorder требует стабильную ссылку: список меняется только вместе с ответом /featured.
  const selected = useMemo(() => curatedWorks(section), [section])

  const { order, getItemProps, moveUp, moveDown } = useReorder(selected, async (ids) => {
    try {
      await setCategoryFeatured(categoryId, ids)
    } catch (err) {
      toast.error(apiErrorMessage(err))
      featured.reload()
      throw err // без throw useReorder не откатит оптимистичный порядок
    }
  })

  // Кандидаты и «пусто ли» считаются от СЕРВЕРНОГО списка (`selected`), а не от `order`:
  // `order` догоняет данные эффектом useReorder — один кадр он ещё пуст, и витринные работы
  // мигали бы в кандидатах вместе с подсказкой «витрина не настроена». Состав от перестановки
  // не зависит, поэтому оптимистичный порядок здесь не нужен — он нужен только при записи.
  const isEmpty = selected.length === 0
  const candidates = useMemo(
    () => featuredCandidates(works.data ?? [], selected.map((w) => w.id)),
    [works.data, selected],
  )

  const persist = async (workIds: number[], message: string) => {
    setBusy(true)
    try {
      await setCategoryFeatured(categoryId, workIds)
      toast.success(message)
      featured.reload()
    } catch (err) {
      // 400 приходит одинаковый на дубль в work_ids и на чужую/несуществующую работу — детали в
      // `detail`. Перечитываем витрину: расхождение с сервером (правка из другой вкладки) уйдёт.
      toast.error(apiErrorMessage(err))
      featured.reload()
    } finally {
      setBusy(false)
    }
  }

  const currentIds = order.map((w) => w.id)
  const loading = featured.loading || works.loading
  const error = featured.error ?? works.error

  return (
    <Card>
      <CardHeader>
        <CardTitle>Витрина раздела</CardTitle>
        <CardDescription>
          Что показывать в секции раздела на странице «Проекты». Первая работа — hero: на
          корневой странице это большой тайл.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && <p className="text-sm text-muted-foreground">Загрузка…</p>}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            <div className="space-y-2">
              {isEmpty ? (
                <p className="text-sm text-muted-foreground">
                  Витрина не настроена — на сайте показываются первые работы раздела. Добавьте
                  работы ниже, чтобы задать свой порядок.
                </p>
              ) : (
                <ul className="space-y-2">
                  {order.map((work, index) => (
                    <li
                      key={work.id}
                      {...getItemProps(index)}
                      className="flex items-center gap-3 rounded-md border p-2"
                    >
                      <ReorderControls
                        index={index}
                        isFirst={index === 0}
                        isLast={index === order.length - 1}
                        onMoveUp={moveUp}
                        onMoveDown={moveDown}
                      />
                      <Thumb src={work.src} alt="" />
                      <span className="flex-1 text-sm font-medium">{workLabel(work)}</span>
                      {index === 0 && (
                        <span className="rounded bg-primary px-2 py-0.5 text-xs font-semibold uppercase text-primary-foreground">
                          Hero
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={busy}
                        aria-label={`Убрать из витрины: ${workLabel(work)}`}
                        onClick={() => persist(withoutWork(currentIds, work.id), 'Работа убрана из витрины')}
                      >
                        <X />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {!isEmpty && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => persist([], 'Витрина очищена')}
                >
                  Очистить витрину
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Добавить работу</h3>
              {candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {works.data && works.data.length > 0
                    ? 'Все работы раздела уже в витрине.'
                    : 'В разделе нет работ с картинками — на сайте они не показываются.'}
                </p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {candidates.map((work) => (
                    <li key={work.id} className="flex items-center gap-3 rounded-md border p-2">
                      <Thumb src={work.src} alt="" />
                      <span className="flex-1 text-sm">{workLabel(work)}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        aria-label={`Добавить в витрину: ${workLabel(work)}`}
                        onClick={() =>
                          persist(withWork(currentIds, work.id), 'Работа добавлена в витрину')
                        }
                      >
                        <Plus />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
