// Единственный источник контактных данных: экран /contacts (оба дерева) и футер
// страниц /projects* (спека редизайна §2.1.4). Строки не дублируем — правка тут
// меняет и контакты, и футер.

export interface ContactChannel {
  /** Подпись канала в верхнем регистре («TELEGRAM», «EMAIL»). */
  label: string
  /** Отображаемое значение («@kristina_pr», «Proksion3@gmail.com»). */
  value: string
  href: string
  /** Ссылка-скачивание (резюме) — не внешний переход. */
  download?: boolean
}

export const TELEGRAM: ContactChannel = {
  label: 'TELEGRAM',
  value: '@Proksion',
  href: 'https://t.me/Proksion',
}

export const EMAIL: ContactChannel = {
  label: 'EMAIL',
  value: 'Proksion3@gmail.com',
  href: 'mailto:Proksion3@gmail.com',
}

export const BEHANCE: ContactChannel = {
  label: 'BEHANCE',
  value: 'behance.net/Proksion',
  href: 'https://www.behance.net/Proksion',
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
export const FOOTER_LEAD_TITLE = 'Открыта к проектным и Full-time предложениям.'
export const FOOTER_LEAD_SUBTITLE =
  'Напишите по любому из каналов — обычно отвечаю в течение суток.'
export const FOOTER_AVAILABILITY_LABEL = 'ДОСТУПНА ДЛЯ РАБОТЫ'
export const FOOTER_TELEGRAM_LABEL = 'НАПИСАТЬ В TELEGRAM'
export const FOOTER_CV_LABEL = 'CV/PDF'
/** Текущий год — подпись в шапке, мета контактов и копирайт футера.
 *  Считается один раз при загрузке модуля, чтобы год не устаревал вручную. */
export const CURRENT_YEAR = new Date().getFullYear()

export const FOOTER_COPYRIGHT = `© PROKSION — ${CURRENT_YEAR}`
