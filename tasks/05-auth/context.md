# Context — 05 auth

## Цель в одной строке
Авторизация одного редактора: пароль (argon2id) → JWT в httpOnly-cookie, guard на `/admin/*`,
login/logout/me, CSRF-защита мутаций, rate-limit логина.

## Опорные разделы спеки
- §7 (авторизация: `Bun.password`, JWT HS256, cookie httpOnly+Secure+SameSite, guard),
  §10 (безопасность), §11 (env `ADMIN_PASSWORD_HASH`, `JWT_SECRET`).

## Что уже есть
- Каркас Elysia (01), слой данных (02). Возможны зависимости `@elysiajs/jwt`, `@elysiajs/cookie`.

## Методология — TDD
- Тесты first: успешный/неуспешный логин, флаги cookie, guard (нет токена / битый токен / валидный),
  `/me`, срабатывание rate-limit, отказ при отсутствии CSRF-условия на мутации.

## Модель
- **Один редактор.** Пароль не хранится — только argon2id-хэш в env `ADMIN_PASSWORD_HASH`
  (генерится `Bun.password.hash`). Логин сверяет `Bun.password.verify`.
- JWT HS256 на `JWT_SECRET`, короткий TTL, в cookie **httpOnly + Secure + SameSite=Lax**.
- Guard покрывает `/admin/*` КРОМЕ `/admin/login`. (Напомним: `/admin/*` здесь — это
  **API-эндпоинты** бэка под префиксом `/api/admin/*` снаружи; статика UI админки — отдельно.)
- CSRF: cookie-сессия → мутации требуют кастомный заголовок (`X-Requested-With`) или
  double-submit-токен. Rate-limit на `/admin/login`.

## Инварианты / ограничения
- Никакой регистрации/ролей/нескольких пользователей (явно вне скоупа — §1).
- Strict TS, без `any`. Секреты только из env, не в коде/репозитории.
- Дать CLI-хелпер для генерации `ADMIN_PASSWORD_HASH` из пароля (одноразовая операция).

## На что НЕ замахиваться
Сами admin-CRUD эндпоинты (задача 06) — здесь только auth-слой и guard, к которому 06 подключится.
</content>
