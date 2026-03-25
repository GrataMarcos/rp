'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Category, Currency, TransactionType } from '@/types'

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  categories: Category[]
  currency: Currency
}

const currencies: Currency[] = ['ARS', 'USD', 'EUR']

export function AddTransactionModal({ isOpen, onClose, onSuccess, categories, currency }: AddTransactionModalProps) {
  const supabase = createClient()
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currency)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const filteredCategories = categories.filter(c => c.type === type || c.type === 'both')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: err } = await supabase.from('transactions').insert({
      user_id: user.id,
      type,
      amount: parseFloat(amount),
      currency: selectedCurrency,
      description: description || null,
      category_id: categoryId || null,
      date,
      source: 'web',
    })

    if (err) {
      setError('Error al guardar. Intentá de nuevo.')
      setLoading(false)
    } else {
      setAmount('')
      setDescription('')
      setCategoryId('')
      setLoading(false)
      onSuccess()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900">Nueva transacción</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type toggle */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-5">
          {(['expense', 'income'] as TransactionType[]).map(t => (
            <button
              key={t}
              onClick={() => { setType(t); setCategoryId('') }}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                type === t
                  ? t === 'expense'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {t === 'expense' ? '💸 Gasto' : '💰 Ingreso'}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount + Currency */}
          <div>
            <label className="label">Monto</label>
            <div className="flex gap-2">
              <input
                type="number"
                className="input flex-1"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="0.01"
                step="0.01"
                required
              />
              <select
                className="input w-24"
                value={selectedCurrency}
                onChange={e => setSelectedCurrency(e.target.value as Currency)}
              >
                {currencies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Descripción <span className="text-slate-400 font-normal">(opcional)</span></label>
            <input
              type="text"
              className="input"
              placeholder={type === 'expense' ? 'Ej: Almuerzo con compañeros' : 'Ej: Sueldo de marzo'}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Category */}
          {filteredCategories.length > 0 && (
            <div>
              <label className="label">Categoría <span className="text-slate-400 font-normal">(opcional)</span></label>
              <select
                className="input"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
              >
                <option value="">Sin categoría</option>
                {filteredCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                ))}
              </select>
            </div>
          )}

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

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className={cn(
              'flex-1 font-medium px-4 py-2 rounded-lg transition-colors text-white',
              type === 'expense' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}>
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
