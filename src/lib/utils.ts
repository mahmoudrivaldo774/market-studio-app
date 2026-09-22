import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number | string): string {
  return `${Number(price).toFixed(2)} جنيه`
}

export function calcDiscount(original: number, sale: number): number {
  if (original <= 0 || sale <= 0 || sale >= original) return 0
  return Math.round(((original - sale) / original) * 100)
}
