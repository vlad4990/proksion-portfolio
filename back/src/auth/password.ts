// Проверка пароля одного редактора (docs/architecture.md §7).
// Пароль НЕ хранится — только argon2id-хэш в env `ADMIN_PASSWORD_HASH`
// (`Bun.password.hash/verify`, встроено в Bun, без зависимостей).
//
// CLI-хелпер (одноразовая операция): `bun run hash <password>` печатает argon2id-хэш
// для `.env` (см. `import.meta.main` ниже).

/** Сгенерировать argon2id-хэш пароля (для `ADMIN_PASSWORD_HASH`). */
export function hashPassword(plain: string): Promise<string> {
  return Bun.password.hash(plain, { algorithm: 'argon2id' })
}

/**
 * Сверить пароль с хэшем. Никогда не бросает: пустой/битый хэш → `false`
 * (Bun.password.verify кидает на некорректном хэше).
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false
  try {
    return await Bun.password.verify(plain, hash)
  } catch {
    return false
  }
}

// --- CLI: bun run hash <password> ---------------------------------------------
if (import.meta.main) {
  const plain = Bun.argv[2]
  if (!plain) {
    console.error('Usage: bun run hash <password>')
    console.error('Печатает argon2id-хэш для переменной ADMIN_PASSWORD_HASH в .env')
    process.exit(1)
  }
  console.log(await hashPassword(plain))
}
