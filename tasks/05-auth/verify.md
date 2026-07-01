# Verify — 05 auth

## Тесты (TDD)
- [ ] `cd back && bun test` — зелёный. Покрыты: password, jwt, login/logout/me, guard, csrf, rate-limit.

## Логин/сессия
- [ ] `POST /api/admin/login` с верным паролем → 200 + `Set-Cookie` с флагами `HttpOnly`,
      `Secure` (в проде), `SameSite=Lax`.
- [ ] Неверный пароль → 401, cookie не ставится.
- [ ] `GET /api/admin/me` без cookie → 401; с валидной cookie → 200 + identity.
- [ ] `POST /api/admin/logout` очищает cookie.

## Guard / CSRF / rate-limit
- [ ] Любой `/api/admin/*` (кроме login) без валидного токена → 401; с битым/просроченным → 401.
- [ ] Мутирующий admin-запрос без CSRF-условия (заголовка/токена) → 403.
- [ ] Превышение лимита попыток логина → 429.

## Хэш-хелпер
- [ ] `bun run hash <pass>` печатает argon2id-хэш, который `verifyPassword` принимает.

## TS / секреты
- [ ] `tsc --noEmit` strict — чисто, без `any`.
- [ ] Секреты (`JWT_SECRET`, `ADMIN_PASSWORD_HASH`) берутся из env, не зашиты в код.

## Done
Auth-слой готов; admin-CRUD ещё нет (задача 06) — но guard уже защищает будущие роуты.
</content>
