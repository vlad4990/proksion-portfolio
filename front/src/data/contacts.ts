/**
 * Контакты Кристины — заглушки, перенесены из _legacy/MobileContacts.jsx.
 * TODO: уточнить и заменить на реальные ссылки у пользователя.
 */
export type ContactLink = {
  /** Имя канала, рендерится в верхнем регистре (Stengazeta). */
  label: string;
  /** Полный href: https://, mailto:, tel:. */
  href: string;
  /** Короткое отображение (handle, адрес и т.п.). */
  hint: string;
};

export const contacts: readonly ContactLink[] = [
  { label: 'Telegram',  href: 'https://t.me/kristina_pr',         hint: '@kristina_pr' },
  { label: 'Email',     href: 'mailto:hi@proksion.ru',            hint: 'hi@proksion.ru' },
  { label: 'Behance',   href: 'https://behance.net/proksion',     hint: 'behance.net/proksion' },
  { label: 'CV · PDF',  href: '#',                                hint: 'Скачать резюме →' },
];

export const contactsIntro =
  'Открыта к проектным и full-time предложениям. Напишите по любому из каналов — обычно отвечаю в течение суток.';
