import { type ClassValue, clsx } from 'clsx'
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Currency } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(amount: number, currency: Currency = 'ARS'): string {
  const locales: Record<Currency, string> = {
    ARS: 'es-AR',
    USD: 'en-US',
    EUR: 'es-ES',
  }
  return new Intl.NumberFormat(locales[currency], {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string, fmt = 'd MMM yyyy'): string {
  return format(parseISO(dateStr), fmt, { locale: es })
}

export function currentMonthRange() {
  const now = new Date()
  return {
    from: format(startOfMonth(now), 'yyyy-MM-dd'),
    to: format(endOfMonth(now), 'yyyy-MM-dd'),
  }
}

export function getMonthLabel(dateStr: string): string {
  return format(parseISO(dateStr + '-01'), 'MMM yyyy', { locale: es })
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
