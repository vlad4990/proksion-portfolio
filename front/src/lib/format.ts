// Форматирование UI-строк редизайна листинга (спека redesign §2.1.2, §2.3.1):
// русские месяцы для крошек «ОБНОВЛЕНО — ИЮЛЬ 2026» и плюрализация счётчика работ
// («1 РАБОТА» / «2 РАБОТЫ» / «68 РАБОТ»). Общее для обоих деревьев.

/** Месяцы в именительном падеже, верхний регистр (display-строки по конвенции проекта). */
const MONTHS = [
  'ЯНВАРЬ',
  'ФЕВРАЛЬ',
  'МАРТ',
  'АПРЕЛЬ',
  'МАЙ',
  'ИЮНЬ',
  'ИЮЛЬ',
  'АВГУСТ',
  'СЕНТЯБРЬ',
  'ОКТЯБРЬ',
  'НОЯБРЬ',
  'ДЕКАБРЬ',
] as const

/**
 * `updated_max` категории → «ИЮЛЬ 2026». Разбираем строку регуляркой, а не `new Date`:
 * бэкенд отдаёт ISO с `Z` (`2026-07-15T10:00:00Z`), а SQLite-дампы — `2026-07-15 10:00:00`
 * (такое `new Date` в Safari не парсит). Точность до месяца, сдвиг таймзоны не важен.
 * `null` — если даты нет или формат неожидан (мета-строка тогда не рендерится).
 */
export function formatUpdated(iso: string | null | undefined): string | null {
  const match = /^(\d{4})-(\d{2})/.exec(iso ?? '')
  if (!match) return null
  const month = MONTHS[Number(match[2]) - 1]
  return month ? `${month} ${match[1]}` : null
}

/** Форма слова «работа» для числа: 1 РАБОТА, 2 РАБОТЫ, 5 РАБОТ, 11 РАБОТ, 21 РАБОТА. */
export function pluralizeWorks(count: number): string {
  const n = Math.abs(Math.trunc(count))
  const tail = n % 100
  if (tail >= 11 && tail <= 14) return 'РАБОТ'
  const last = n % 10
  if (last === 1) return 'РАБОТА'
  if (last >= 2 && last <= 4) return 'РАБОТЫ'
  return 'РАБОТ'
}

/** Готовая строка бейджа: «68 РАБОТ». */
export function formatWorksCount(count: number): string {
  return `${Math.abs(Math.trunc(count))} ${pluralizeWorks(count)}`
}

/** Форма слова «раздел»: 1 РАЗДЕЛ, 2 РАЗДЕЛА, 5 РАЗДЕЛОВ, 11 РАЗДЕЛОВ. */
export function pluralizeSections(count: number): string {
  const n = Math.abs(Math.trunc(count))
  const tail = n % 100
  if (tail >= 11 && tail <= 14) return 'РАЗДЕЛОВ'
  const last = n % 10
  if (last === 1) return 'РАЗДЕЛ'
  if (last >= 2 && last <= 4) return 'РАЗДЕЛА'
  return 'РАЗДЕЛОВ'
}

/** Подсказка-скролл корневой /projects: «05 РАЗДЕЛОВ» (номер с ведущим нулём, как в дизайне). */
export function formatSectionsCount(count: number): string {
  const n = Math.abs(Math.trunc(count))
  return `${String(n).padStart(2, '0')} ${pluralizeSections(n)}`
}
