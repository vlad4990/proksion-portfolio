# Context — 17 front-ds-shared

## Зачем

Фундамент редизайна во `/front` (спека: [`docs/projects-redesign.md`](../../docs/projects-redesign.md)
§3, §5.6, §6): новые токены, API-слой под новые эндпоинты, общие атомы (чипы, бейджи,
футер), перевод модалки на слаговые URL. Страницы (18–19) строятся поверх.

## Что уже есть в репо

- **Токены** — `front/src/styles/tokens.css`: палитра/семантика/тиры уже совпадают
  с дизайном (pk-переменные Pen-файла — зеркало этого файла, см. спеку §3).
  Дизайн-фрейм токенов: `ZRSQk` в `front/1111.pen` (смотреть только Pencil MCP).
- **API-слой** — `front/src/api/`: `client.ts` (тонкие fetch-обёртки, `getJson<T>`,
  `ApiError`), `types.ts` (типы уже дополнены задачей 14: `Tile.slug/.title`,
  `CategoryNav.*`, `TagNav`, `FeaturedSection`, `WorkDetail.tag_ids`),
  `useProjects.ts` (сессионные кэши: `categoriesCache`, `tilesCache` Map;
  инициализация из кэша синхронно, ревалидации нет — осознанно),
  `useWorkDetail.ts` (`detailCache`).
- **Модалка** — контроллер `front/src/hooks/useWorkModal.ts` (общий для двух
  деревьев): параметр `:work` сейчас — **числовой id**, деталь через
  `getWorkById` (`GET /works/by-id/:id`); `?img=` — пиннинг слайда; `close()` →
  navigate на листинг. Бэкенд-эндпоинт по слагу `GET /works/:cat/:sub/:work`
  существует, фронт его не зовёт.
- **Двойное дерево** — `components/desktop/*` / `components/mobile/*`
  (`useIsMobile`, ветка в `App.tsx:40,103`). Общих компонентов почти нет
  (только `components/WorkImage.tsx`) — для новых атомов завести
  `components/shared/`.
- **Футер-референс** — контакты уже свёрстаны в `ContactsScreen.tsx` /
  `MobileContacts.tsx` (email, Telegram и т.д.) — источник ссылок-констант.
- **Стайлинг** — CSS Modules, только `var(--token)`; правило «Бренд — святое».

## Инварианты / ограничения

- Методология — **SDD**: проверка = `npm run build` (tsc strict) + визуал.
- **Никаких новых зависимостей.**
- Существующие экраны (`ProjectsScreen` и т.д.) в этой задаче не переделываются —
  только не должны сломаться (типы/контроллер модалки общие!).
- Правки `tokens.css` — только добавление новых токенов из спеки §3; существующие
  значения не менять.

## На что НЕ замахиваться

- Разметка страниц — задачи 18 (корневая) и 19 (категория).
- Никакого рефакторинга занавеса-героя, TopNav, MobileTabBar.
