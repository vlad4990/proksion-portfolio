// Слаги (docs/architecture.md §3): транслит ru→lat → slugify → уникальность в области.
// Без зависимостей — своя маленькая таблица транслитерации.

const TRANSLIT: Readonly<Record<string, string>> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'E', Ж: 'Zh', З: 'Z',
  И: 'I', Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P', Р: 'R',
  С: 'S', Т: 'T', У: 'U', Ф: 'F', Х: 'H', Ц: 'Ts', Ч: 'Ch', Ш: 'Sh', Щ: 'Sch',
  Ъ: '', Ы: 'Y', Ь: '', Э: 'E', Ю: 'Yu', Я: 'Ya',
}

/** Транслитерация кириллицы в латиницу (регистр сохраняется); прочие символы — как есть. */
export function transliterate(input: string): string {
  let out = ''
  for (const ch of input) {
    out += ch in TRANSLIT ? TRANSLIT[ch] : ch
  }
  return out
}

/**
 * Слаг из заголовка: транслит → lowercase → пробелы в `-` → только `[a-z0-9-]`.
 * Пустой/непереводимый результат → детерминированный `fallback` (не пустая строка).
 */
export function slugify(title: string, fallback = 'item'): string {
  const slug = transliterate(title)
    .toLowerCase()
    .replace(/[\s_]+/g, '-') // пробелы/подчёркивания → дефис
    .replace(/[^a-z0-9-]+/g, '') // выкинуть всё кроме [a-z0-9-]
    .replace(/-+/g, '-') // схлопнуть кратные дефисы
    .replace(/^-+|-+$/g, '') // обрезать дефисы по краям
  return slug.length > 0 ? slug : fallback
}

/**
 * Гарантирует уникальность `base` среди `existing`, добавляя суффикс `-2`, `-3`, ...
 * до первого свободного слота.
 */
export function uniqueSlug(base: string, existing: Iterable<string>): string {
  const taken = new Set(existing)
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}
