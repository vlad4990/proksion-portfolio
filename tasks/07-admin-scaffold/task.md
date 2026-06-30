# Task — 07 admin-scaffold

**Слой:** `/admin`. **Методология:** **TDD** (Vitest+RTL) для логики; UI — компонентно. Спека: §8, §7.

## Цель
Рабочий каркас админки: Tailwind+shadcn/ui настроены, роутер под `/admin/`, типизированный
API-клиент, полный флоу логина (login → session guard → logout), тест-инфраструктура.

## Шаги

### 1. Стиль и компоненты
- Подключить **Tailwind** к проекту `/admin` (config, директивы в глобальном CSS).
- Инициализировать **shadcn/ui** (`components.json`), добавить базовый набор: `button`, `input`,
  `label`, `form`, `card`, `dialog`, `table`, `toast`/`sonner`. (Компоненты копируются в репо.)
- Проверить, что Tailwind/shadcn рендерятся, и что всё это в `/admin`, а не в `/front`.

### 2. Роутинг
- `react-router` с учётом `base:'/admin/'`. Маршруты-заготовки: `/admin/login`,
  `/admin` (dashboard, защищён). Layout-обёртка (шапка/выход).

### 3. API-клиент (TDD)
- `src/api/client.ts` — обёртка над `fetch`: база `/api`, `credentials:'include'`,
  CSRF-заголовок на мутациях, разбор ошибок (в т.ч. 401 → разлогин/редирект на login).
- Тесты first (Vitest, мок `fetch`): корректные заголовки, проброс тела, обработка 401/4xx/5xx.

### 4. Auth-флоу (TDD)
- `src/auth/` — стор/хук сессии: `login(password)`, `logout()`, `useSession()` (через
  `GET /admin/me`). `RequireAuth` — guard роутов (редирект неаутентифицированных на `/admin/login`).
- Страница `LoginPage` (форма shadcn, валидация). Тесты first: стор (login успех/провал, logout,
  восстановление сессии по `/me`), guard (пускает/редиректит), валидация формы.

### 5. Тест-инфраструктура
- **Vitest** + `@testing-library/react` + jsdom. Скрипт `test` → `vitest`. Базовый setup
  (jest-dom матчеры). Конфиг не конфликтует с Vite-сборкой.

### 6. Dev-опыт
- `vite.config.ts`: dev-proxy `/api`→`http://localhost:3001` (и `/media` при нужде), порт 5006.

## Требования
- Strict TS, без `any`. Один layout (десктоп). Изоляция от `/front` (свой `package.json`).
- Никаких реальных CRUD-экранов — только заглушка dashboard за guard'ом.

## Deliverables
Настроенные Tailwind+shadcn, роутер, `api/client`, `auth/*`, `LoginPage`, Vitest+RTL, dev-proxy.
`vitest` зелёный, `npm run build` зелёный, логин работает против запущенного `back`.
</content>
