// Единственный источник контактных данных: экран /contacts (оба дерева) и футер
// страниц /projects* (спека редизайна §2.1.4). Строки не дублируем — правка тут
// меняет и контакты, и футер.

export interface ContactChannel {
  /** Подпись канала в верхнем регистре («TELEGRAM», «EMAIL»). */
  label: string
  /** Отображаемое значение («@kristina_pr», «hi@proksion.ru»). */
  value: string
  href: string
  /** Ссылка-скачивание (резюме) — не внешний переход. */
  download?: boolean
}

export const TELEGRAM: ContactChannel = {
  label: 'TELEGRAM',
  value: '@kristina_pr',
  href: 'https://t.me/kristina_pr',
}

export const EMAIL: ContactChannel = {
  label: 'EMAIL',
  value: 'hi@proksion.ru',
  href: 'mailto:hi@proksion.ru',
}

export const BEHANCE: ContactChannel = {
  label: 'BEHANCE',
  value: 'behance.net/proksion',
  href: 'https://behance.net/proksion',
}

export const CV: ContactChannel = {
  label: 'CV / PDF',
  value: 'Скачать резюме',
  href: '#',
  download: true,
}

/** Порядок строк на экране /contacts (нумерация 01…04 — по индексу). */
export const CONTACT_CHANNELS: ContactChannel[] = [TELEGRAM, EMAIL, BEHANCE, CV]

/** Соцссылки нижнего бара футера (только реально существующие каналы). */
export const FOOTER_SOCIALS: ContactChannel[] = [BEHANCE, TELEGRAM]

/** Тексты футера /projects* (дизайн: фреймы tVnqG / N8NrSi). */
export const FOOTER_CTA = 'ЕСТЬ ЗАДАЧА ПОД ГРАФИКУ?'
export const FOOTER_TELEGRAM_LABEL = 'НАПИСАТЬ В TELEGRAM'
export const FOOTER_COPYRIGHT = '© PROKSION — 2026'
