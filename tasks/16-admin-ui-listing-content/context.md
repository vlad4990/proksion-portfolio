# Context — 16 admin-ui-listing-content

## Зачем

Весь новый контент листинга (спека: [`docs/projects-redesign.md`](../../docs/projects-redesign.md)
§7) должен управляться из админки: контентные поля категории, теги (CRUD + разметка
работ), витрина раздела. API готов: публичные GET'ы — задача 14, admin-мутации —
задача 15.

## Что уже есть в репо

- **`/admin`** — отдельное Vite+React+TS приложение (`base: '/admin/'`),
  Tailwind + shadcn; свой бандл, ноль пересечения с публичным `/front`
  (`docs/architecture.md` §8). Экраны: логин, CRUD категорий/подкатегорий/работ,
  загрузка/сортировка картинок, cover, описания.
- **API-клиент** — `admin/src/api/`: `types.ts` (зеркало `back/src/dto.ts`,
  уже дополнено задачей 14: `TagNav`, `FeaturedSection`, `Tile.slug/.title`,
  `CategoryNav`-меты, `WorkDetailById.tag_ids`) и модули запросов
  (`content.ts` — чтение через **публичные** GET'ы; мутации — через
  `/api/admin/*` с заголовком `X-Requested-With` и cookie).
- **Паттерны UI** — существующие страницы `admin/src/pages/`: `CategoriesPage`,
  `SubcategoriesPage`, `WorksPage`, `WorkDetailPage`, `LoginPage`. Роуты —
  `admin/src/App.tsx:30-43` (`/` → категории → `/categories/:catSlug` → … →
  карточка работы). Читаются данные через `admin/src/lib/useResource.ts`
  (`{data, loading, error, reload}`).
- **Формы** — react-hook-form + zod (`admin/src/forms/schemas.ts`: `emptyToNull`,
  `toNamedEntityPayload`, `toWorkPatch` — пустой слаг опускается, пустые строки →
  null). ⚠️ `NamedEntityDialog` — **общая** форма категории И подкатегории:
  новые поля категории добавлять через проп-переключатель или отдельный
  `CategoryDialog`, не сломав подкатегории. Форма работы — `WorkDialog`
  (+`MarkdownEditor` для description).
- **Ошибки** — конвенция: ошибки субмита формы бросаются и рендерятся инлайн
  (`role="alert"` внутри диалога); ошибки прочих мутаций —
  `toast.error(apiErrorMessage(err))` (sonner), успех — `toast.success` +
  `reload()`. Тексты кодов — `admin/src/lib/errors.ts`.
- **Перестановка порядка** — готовый механизм без DnD-библиотек: чистая логика
  `admin/src/lib/reorder.ts` → хук `admin/src/components/useReorder.ts`
  (оптимистичный порядок + откат; ⚠️ требует **мемоизированный** `items`;
  persist-колбэк обязан `throw` при ошибке — иначе не откатится) → кнопки/DnD
  `admin/src/components/ReorderControls.tsx`. Для тегов persist шлёт
  `PATCH /admin/tags/reorder {ids}`, для витрины — `…/featured {work_ids}`.
- **Известный контракт-гэп** (частично чинится задачей 14): публичный тайл
  раньше не имел slug/title, поэтому `WorksPage` держит сессионный «реестр
  работ» (`admin/src/content/work-registry.tsx` + `admin/src/lib/works-view.ts`),
  и у работ из прошлых сессий кнопка «Управление» disabled. После задачи 14
  `Tile.slug/.title` приходят из API — см. шаг полировки в task.md.
- **Тесты** — Vitest + RTL, co-located `*.test.ts(x)`; эталонные паттерны:
  мок API-модуля `vi.hoisted` + `vi.mock('@/api/content', …)` + `mockReset()`
  в `beforeEach`, рендер в `<MemoryRouter>`, выборка по ролям и русским
  лейблам, ассерты на payload и рефетч (`CategoriesPage.test.tsx`); хуки —
  `renderHook`+`act` (`useReorder.test.tsx`). **TDD для логики** (api-клиент,
  маппинг форм, редьюсеры), поведение экранов — RTL-интеграционно.
- **Тесты** — Vitest + RTL; **TDD для логики** (api-клиент, хуки, валидация
  форм), для разметки — покрытие поведения (interaction) там, где есть логика
  (конвенция `tasks/README.md`, методология).

## Мутации, доступные с задачи 15

| Что | Запрос |
| --- | --- |
| Меты категории | PATCH `/admin/categories/:id` (+ `kicker`, `meta_role`, `period`, `description_long`, `display_variant`) |
| Теги | POST/PATCH/DELETE `/admin/tags[/:id]`, PATCH `/admin/tags/reorder` |
| Теги работы | PATCH `/admin/works/:id` `{tag_ids: number[]}` (полная замена) |
| Витрина | PATCH `/admin/categories/:id/featured` `{work_ids: number[]}` (порядок = витрина, 0 = hero; пусто = очистить) |

Чтение: `GET /api/tags` (со счётчиками), `GET /api/featured` (кураторский список +
fallback), `GET /api/works?category=<slug>` (все видимые работы категории,
пагинация limit≤100), `WorkDetailById.tag_ids`.

## Инварианты / ограничения

- Админка — back-office: строгих рамок бренда нет, использовать существующие
  shadcn-компоненты; **не добавлять новые тяжёлые зависимости** без нужды
  (dnd-библиотеку не заводить, если перестановка уже решена в проекте кнопками
  вверх/вниз — переиспользовать этот же механизм).
- Работа «видимая» = с картинками: `/works?category=` не отдаёт работы без
  картинок — в витрину их добавить нельзя (это ок, на публичной странице они
  всё равно невидимы).
- UI-тексты — русские.

## На что НЕ замахиваться

- Публичный фронт (17–19), бэкенд (13–15) — готовы/не трогать.
- Превью публичных страниц внутри админки — вне скоупа.
- Undo/история изменений — нет.
