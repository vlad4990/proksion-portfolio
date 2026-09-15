// Стрелка-глиф ссылок («ВСЕ РАБОТЫ ↗», «NN РАЗДЕЛОВ ↓», строки контактов, футер).
// Раньше это были юникод-символы ↗/↓ прямо в тексте — на iOS они подхватываются
// эмодзи-шрифтом и рисуются цветной плашкой (замечание заказчика 2026-09-15), да и
// в остальных системах форма глифа пляшет от шрифта. Теперь — inline-SVG: одна и та
// же геометрия везде, `currentColor` и размер в `em`, т.е. стрелка живёт по правилам
// текста, рядом с которым стоит (наследует цвет, размер и hover-состояния ссылки).

import styles from './Arrow.module.css'

interface ArrowProps {
  /** 'ne' — «наружу» (внешняя ссылка/переход), 'down' — скролл к секции,
   *  'right' — переход по строке (скачивание CV в мобильных контактах). */
  dir?: 'ne' | 'down' | 'right'
  /** Доп. класс от экрана (обычно — свой размер через font-size). */
  className?: string
}

export function Arrow({ dir = 'ne', className }: ArrowProps) {
  const cls = className ? `${styles.icon} ${className}` : styles.icon
  return (
    <svg
      className={cls}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      focusable="false"
    >
      {dir === 'ne' && (
        <>
          <path d="M3.75 12.25 12.25 3.75" />
          <path d="M5.75 3.75h6.5v6.5" />
        </>
      )}
      {dir === 'down' && (
        <>
          <path d="M8 3v10" />
          <path d="M3.5 8.5 8 13l4.5-4.5" />
        </>
      )}
      {dir === 'right' && (
        <>
          <path d="M3 8h10" />
          <path d="M8.5 3.5 13 8l-4.5 4.5" />
        </>
      )}
    </svg>
  )
}
