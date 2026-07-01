# Task — 05 auth

**Слой:** `/back`. **Методология:** **TDD** (`bun test`). Спека: §7, §10, §11.

## Цель
Рабочий auth-слой для одного редактора: login/logout/me, JWT в защищённой cookie, guard для
`/admin/*`, CSRF и rate-limit. Готовая точка подключения для admin-CRUD (задача 06).

## Структура
```
back/src/auth/
├── password.ts     verify(plain, hash) через Bun.password; + CLI-хелпер генерации хэша
├── jwt.ts          sign/verify HS256 (JWT_SECRET, TTL)
├── guard.ts        middleware: проверка cookie-JWT для /admin/* (кроме /admin/login)
└── csrf.ts         требование X-Requested-With / double-submit для мутаций
back/src/routes/admin/auth.ts   POST /admin/login, POST /admin/logout, GET /admin/me
```

## Шаги (TDD — тесты первыми)

1. **password.ts** — `verifyPassword(plain, hash)` (Bun.password.verify). Тест: верный/неверный
   пароль. Плюс скрипт `bun run hash <password>` → печатает argon2id-хэш для `.env`.
2. **jwt.ts** — `sign(payload)`, `verify(token)` (HS256, `JWT_SECRET`, короткий TTL). Тест:
   round-trip; просроченный/битый/чужой-секрет → отказ.
3. **routes/admin/auth.ts**:
   - `POST /admin/login` — сверить пароль с `ADMIN_PASSWORD_HASH`; при успехе — выставить cookie
     с JWT (**httpOnly, Secure, SameSite=Lax, Path=/**); при неуспехе — 401.
   - `POST /admin/logout` — очистить cookie.
   - `GET /admin/me` — вернуть identity, если cookie валидна, иначе 401.
   Тесты: успех ставит cookie с правильными флагами; неуспех → 401; `/me` без/с cookie.
4. **guard.ts** — защитить все `/admin/*` кроме `/admin/login`. Тест: запрос без токена → 401;
   с битым → 401; с валидным → проходит.
5. **csrf.ts** — на мутирующих admin-роутах требовать кастомный заголовок (или double-submit).
   Тест: мутация без заголовка → 403; с заголовком → проходит.
6. **rate-limit** на `/admin/login` (напр. N попыток/окно). Тест: после превышения → 429.

## Требования
- Cookie-флаги строго: `HttpOnly`, `Secure`, `SameSite=Lax` (в dev по HTTP `Secure` может
  мешать — предусмотреть переключатель по env, но дефолт безопасный).
- Strict TS, без `any`. Секреты из env. Сообщения об ошибках не раскрывают, что именно неверно.

## Deliverables
`auth/{password,jwt,guard,csrf}.ts`, `routes/admin/auth.ts`, CLI-хелпер хэша, тесты.
`bun test` зелёный.
</content>
