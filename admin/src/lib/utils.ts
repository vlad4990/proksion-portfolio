import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Объединяет className-значения (clsx) и схлопывает конфликтующие tailwind-классы (twMerge). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
