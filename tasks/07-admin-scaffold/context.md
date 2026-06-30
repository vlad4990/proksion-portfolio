# Context — 07 admin-scaffold

## Цель в одной строке
Превратить placeholder `/admin` (из задачи 01) в реальное приложение: Tailwind + shadcn/ui,
роутер, API-клиент, флоу логина — с Vitest+RTL и TDD для логики.

## Опорные разделы спеки
- §8 («Админка — отдельный проект `/admin` (свой контекст)»), §7 (auth-эндпоинты, CSRF).

## Что уже есть
- `/admin` — минимальный Vite+React+TS, `base:'/admin/'` (задача 01).
- Бэкенд-auth: `POST /admin/login`, `POST /admin/logout`, `GET /admin/me` (снаружи `/api/admin/*`),
  cookie-сессия + требование CSRF-заголовка на мутациях (задача 05).

## Методология
- **TDD** для НЕ-визуальной логики: API-клиент (заголовки, обработка ошибок/401), auth-стор/хук,
  guard роутов, валидация форм логина. Тесты — **Vitest + @testing-library/react**.
- UI-компоненты (shadcn) — без тест-ферст; поведение покрываем RTL там, где есть логика.

## Стек админки
- **Tailwind** + **shadcn/ui** (CLI копирует компоненты в репозиторий — это не runtime-пакет;
  потянет Radix + `clsx`/`tailwind-merge`/`class-variance-authority`/`lucide-react`). Всё это
  изолировано в `/admin` и **не влияет на бандл `/front`**.
- `react-router` под `base:'/admin/'`. Dev-сервер на 5006, dev-proxy `/api`→`localhost:3001`.

## Инварианты / ограничения
- Strict TS, без `any`. Один служебный layout (десктоп), без двойного дерева desktop/mobile.
- Cookie-сессия: fetch с `credentials: 'include'`; мутации шлют CSRF-заголовок (`X-Requested-With`
  или double-submit — согласовать с реализацией задачи 05).
- Это **каркас**: только инфраструктура UI + auth-флоу + клиент. Экраны управления контентом —
  задача 08.
- Токены бренда `front/src/styles/tokens.css` можно переиспользовать опционально (для согласия
  по цветам/шрифтам), но строгих рамок бренда в админке нет.

## На что НЕ замахиваться
CRUD-экраны, загрузка картинок, drag-n-drop (задача 08).
</content>
