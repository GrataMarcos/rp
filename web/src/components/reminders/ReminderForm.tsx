'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X, Bell } from 'lucide-react'
import type { Currency, ReminderRecurrence, Reminder, Group } from '@/types'
import { cn } from '@/lib/utils'

interface ReminderFormProps {
  groups: Group[]
  defaultCurrency: Currency
  reminder?: Reminder  // if editing
  onClose: () => void
}

const currencies: Currency[] = ['ARS', 'USD', 'EUR']
const recurrences: { id: ReminderRecurrence; label: string }[] = [
  { id: 'monthly', label: 'Mensual' },
  { id: 'yearly', label: 'Anual' },
  { id: 'one-time', label: 'Una vez' },
]

function nextDueDate(dueDay: number, recurrence: ReminderRecurrence): string {
  const today = new Date()
  if (recurrence === 'one-time') {
    // Use today + 30 days as placeholder
    const d = new Date(today)
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  }
  // Find next occurrence of dueDay this month or next
  const year = today.getFullYear()
  const month = today.getMonth()
  let candidate = new Date(year, month, dueDay)
  if (candidate <= today) {
    candidate = new Date(year, month + 1, dueDay)
  }
  return candidate.toISOString().split('T')[0]
}

export function ReminderForm({ groups, defaultCurrency, reminder, onClose }: ReminderFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState(reminder?.title ?? '')
  const [description, setDescription] = useState(reminder?.description ?? '')
  const [amount, setAmount] = useState(reminder?.amount?.toString() ?? '')
  const [currency, setCurrency] = useState<Currency>(reminder?.currency as Currency ?? defaultCurrency)
  const [dueDay, setDueDay] = useState(reminder?.due_day?.toString() ?? '1')
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>(reminder?.recurrence ?? 'monthly')
  const [groupId, setGroupId] = useState(reminder?.group_id ?? '')
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(reminder?.notify_whatsapp ?? true)
  const [notifyDaysBefore, setNotifyDaysBefore] = useState(reminder?.notify_days_before?.toString() ?? '3')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      amount: amount ? parseFloat(amount) : null,
      currency,
      due_day: parseInt(dueDay),
      recurrence,
      group_id: groupId || null,
      notify_whatsapp: notifyWhatsapp,
      notify_days_before: parseInt(notifyDaysBefore),
      next_due_date: nextDueDate(parseInt(dueDay), recurrence),
      is_active: true,
    }

    let err
    if (reminder) {
      const res = await supabase.from('reminders').update(payload).eq('id', reminder.id)
      err = res.error
    } else {
      const res = await supabase.from('reminders').insert(payload)
      err = res.error
    }

    setLoading(false)
    if (err) {
      setError('Error al guardar el recordatorio')
    } else {
      router.refresh()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary-600" />
            <h2 className="font-semibold text-slate-900">
              {reminder ? 'Editar recordatorio' : 'Nuevo recordatorio'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="label">Título *</label>
            <input
              type="text"
              className="input"
              placeholder="Ej: Alquiler, Internet, Impuesto ABL..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Descripción (opcional)</label>
            <input
              type="text"
              className="input"
              placeholder="Detalle adicional"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monto (opcional)</label>
              <input
                type="number"
                className="input"
                placeholder="0"
                min="0"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Moneda</label>
              <select className="input" value={currency} onChange={e => setCurrency(e.target.value as Currency)}>
                {currencies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Día de vencimiento</label>
              <input
                type="number"
                className="input"
                min="1"
                max="31"
                value={dueDay}
                onChange={e => setDueDay(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Recurrencia</label>
              <select className="input" value={recurrence} onChange={e => setRecurrence(e.target.value as ReminderRecurrence)}>
                {recurrences.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
          </div>

          {groups.length > 1 && (
            <div>
              <label className="label">Grupo</label>
              <select className="input" value={groupId} onChange={e => setGroupId(e.target.value)}>
                <option value="">Sin grupo (personal)</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}

          <div className="p-4 bg-slate-50 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Notificar por WhatsApp</label>
              <button
                type="button"
                onClick={() => setNotifyWhatsapp(!notifyWhatsapp)}
                className={cn(
                  'relative w-10 h-5 rounded-full transition-colors',
                  notifyWhatsapp ? 'bg-primary-500' : 'bg-slate-200'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                  notifyWhatsapp ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </button>
            </div>
            {notifyWhatsapp && (
              <div>
                <label className="label">Días de anticipación</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  max="30"
                  value={notifyDaysBefore}
                  onChange={e => setNotifyDaysBefore(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !title.trim()} className="btn-primary flex-1">
              {loading ? 'Guardando...' : reminder ? 'Guardar cambios' : 'Crear recordatorio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
