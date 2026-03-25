import Link from 'next/link'
import { Bell, ChevronRight } from 'lucide-react'
import type { Reminder, Currency } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { differenceInDays, parseISO } from 'date-fns'

interface UpcomingRemindersProps {
  reminders: Reminder[]
  defaultCurrency: Currency
}

export function UpcomingReminders({ reminders, defaultCurrency }: UpcomingRemindersProps) {
  if (reminders.length === 0) return null

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-900">Próximos vencimientos</h2>
        <Link href="/reminders" className="text-xs text-primary-600 hover:underline flex items-center gap-0.5">
          Ver todos <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-3">
        {reminders.map(r => {
          const daysLeft = r.next_due_date
            ? differenceInDays(parseISO(r.next_due_date), new Date())
            : null
          const overdue = daysLeft !== null && daysLeft < 0

          return (
            <div key={r.id} className="flex items-center gap-3">
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                overdue ? 'bg-red-100' : daysLeft !== null && daysLeft <= 3 ? 'bg-amber-100' : 'bg-slate-100'
              )}>
                <Bell className={cn(
                  'w-4 h-4',
                  overdue ? 'text-red-500' : daysLeft !== null && daysLeft <= 3 ? 'text-amber-500' : 'text-slate-400'
                )} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{r.title}</p>
                <p className={cn(
                  'text-xs',
                  overdue ? 'text-red-500' : daysLeft !== null && daysLeft <= 3 ? 'text-amber-500' : 'text-slate-400'
                )}>
                  {daysLeft === null ? '—'
                    : overdue ? `Venció hace ${Math.abs(daysLeft)} días`
                    : daysLeft === 0 ? 'Vence hoy'
                    : `En ${daysLeft} días`}
                </p>
              </div>

              {r.amount && (
                <span className="text-sm font-semibold text-slate-700 flex-shrink-0">
                  {formatCurrency(r.amount, r.currency as Currency)}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
