'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import type { Transaction, Category, Currency, Group } from '@/types'
import { cn } from '@/lib/utils'

interface EditTransactionModalProps {
  transaction: Transaction
  categories: Category[]
  groups: Group[]
  onClose: () => void
}

const currencies: Currency[] = ['ARS', 'USD', 'EUR']

export function EditTransactionModal({ transaction, categories, groups, onClose }: EditTransactionModalProps) {
  const router = useRouter()
  const supabase = createClient()

  const [type, setType] = useState(transaction.type)
  const [amount, setAmount] = useState(transaction.amount.toString())
  const [currency, setCurrency] = useState<Currency>(transaction.currency)
  const [description, setDescription] = useState(transaction.description ?? '')
  const [categoryId, setCategoryId] = useState(transaction.category_id ?? '')
  const [groupId, setGroupId] = useState(transaction.group_id ?? '')
  const [date, setDate] = useState(transaction.date)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const filteredCategories = categories.filter(c => c.type === type || c.type === 'both')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = await supabase
      .from('transactions')
      .update({
        type,
        amount: parseFloat(amount),
        currency,
        description: description.trim() || null,
        category_id: categoryId || null,
        group_id: groupId || null,
        date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction.id)

    setLoading(false)
    if (err) {
      setError('Error al guardar los cambios')
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
          <h2 className="font-semibold text-slate-900">Editar transacción</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {/* Type toggle */}
          <div className="flex rounded-xl bg-slate-100 p-1">
            {(['expense', 'income'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
                  type === t
                    ? t === 'expense'
                      ? 'bg-white text-red-600 shadow-sm'
                      : 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-500'
                )}
              >
                {t === 'expense'
                  ? <><ArrowDownRight className="w-4 h-4" /> Gasto</>
                  : <><ArrowUpRight className="w-4 h-4" /> Ingreso</>
                }
              </button>
            ))}
          </div>

          {/* Amount + currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="label">Monto *</label>
              <input
                type="number"
                className="input"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Moneda</label>
              <select className="input" value={currency} onChange={e => setCurrency(e.target.value as Currency)}>
                {currencies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Descripción</label>
            <input
              type="text"
              className="input"
              placeholder="Detalle de la transacción"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Category */}
          <div>
            <label className="label">Categoría</label>
            <select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">Sin categoría</option>
              {filteredCategories.map(c => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="label">Fecha</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>

          {/* Group (if user has multiple groups) */}
          {groups.length > 1 && (
            <div>
              <label className="label">Grupo</label>
              <select className="input" value={groupId} onChange={e => setGroupId(e.target.value)}>
                <option value="">Sin grupo</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !amount} className="btn-primary flex-1">
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
