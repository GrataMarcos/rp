'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, Pencil, Trash2, CheckCircle, Calendar, RefreshCw } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ReminderForm } from './ReminderForm'
import { formatCurrency } from '@/lib/utils'
import type { Reminder, Group, Currency } from '@/types'
import { differenceInDays, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

interface ReminderListProps {
  reminders: Reminder[]
  groups: Group[]
  defaultCurrency: Currency
}

const recurrenceLabels = {
  monthly: 'Mensual',
  yearly: 'Anual',
  'one-time': 'Una vez',
}

function urgencyColor(daysLeft: number | null) {
  if (daysLeft === null) return 'text-slate-400'
  if (daysLeft < 0) return 'text-red-600'
  if (daysLeft <= 3) return 'text-red-500'
  if (daysLeft <= 7) return 'text-amber-500'
  return 'text-emerald-600'
}

export function ReminderList({ reminders, groups, defaultCurrency }: ReminderListProps) {
  const router = useRouter()
  const supabase = createClient()
  const [editing, setEditing] = useState<Reminder | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await supabase.from('reminders').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    router.refresh()
  }

  async function handleToggle(reminder: Reminder) {
    await supabase
      .from('reminders')
      .update({ is_active: !reminder.is_active })
      .eq('id', reminder.id)
    router.refresh()
  }

  if (reminders.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Bell className="w-8 h-8 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">No hay recordatorios todavía</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {reminders.map(r => {
          const daysLeft = r.next_due_date
            ? differenceInDays(parseISO(r.next_due_date), new Date())
            : null

          const overdue = daysLeft !== null && daysLeft < 0
          const urgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3

          return (
            <div
              key={r.id}
              className={cn(
                'card p-4 flex items-start gap-4',
                !r.is_active && 'opacity-50',
                overdue && 'border-red-200 bg-red-50',
                urgent && !overdue && 'border-amber-200 bg-amber-50',
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
                overdue ? 'bg-red-100' : urgent ? 'bg-amber-100' : 'bg-primary-100'
              )}>
                <Bell className={cn(
                  'w-5 h-5',
                  overdue ? 'text-red-600' : urgent ? 'text-amber-600' : 'text-primary-600'
                )} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-900">{r.title}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditing(r)}
                      className="p-1.5 text-slate-300 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(r)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                  {r.amount && (
                    <span className="text-sm font-semibold text-slate-700">
                      {formatCurrency(r.amount, r.currency as Currency)}
                    </span>
                  )}

                  {r.next_due_date && (
                    <span className={cn('flex items-center gap-1 text-xs font-medium', urgencyColor(daysLeft))}>
                      <Calendar className="w-3 h-3" />
                      {overdue
                        ? `Vencido hace ${Math.abs(daysLeft!)} días`
                        : daysLeft === 0
                          ? 'Vence hoy'
                          : `Vence en ${daysLeft} días`
                      }
                    </span>
                  )}

                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <RefreshCw className="w-3 h-3" />
                    {recurrenceLabels[r.recurrence]}
                  </span>

                  {r.group && (
                    <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                      {r.group.name}
                    </span>
                  )}
                </div>

                {r.description && (
                  <p className="text-xs text-slate-400 mt-1">{r.description}</p>
                )}
              </div>

              {/* Toggle active */}
              <button
                onClick={() => handleToggle(r)}
                className={cn(
                  'p-1.5 rounded-lg transition-colors flex-shrink-0',
                  r.is_active
                    ? 'text-emerald-500 hover:bg-emerald-50'
                    : 'text-slate-300 hover:bg-slate-100'
                )}
                title={r.is_active ? 'Desactivar' : 'Activar'}
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>

      {editing && (
        <ReminderForm
          groups={groups}
          defaultCurrency={defaultCurrency}
          reminder={editing}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar recordatorio"
        message={`¿Eliminás el recordatorio "${deleteTarget?.title}"?`}
        confirmLabel="Eliminar"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
