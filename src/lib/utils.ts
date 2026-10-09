import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (e) {
      console.warn("Clipboard API failed, trying fallback", e)
    }
  }
  
  return new Promise((resolve) => {
    try {
      const textArea = document.createElement("textarea")
      textArea.value = text
      textArea.style.position = "fixed"
      textArea.style.left = "-999999px"
      textArea.style.top = "-999999px"
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const successful = document.execCommand('copy')
      textArea.remove()
      resolve(successful)
    } catch (err) {
      resolve(false)
    }
  })
}

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
