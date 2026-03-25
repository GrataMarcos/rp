'use client'

import { useState } from 'react'
import { Plus, TrendingUp, TrendingDown, Trash2, Edit2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import type { Investment, Currency } from '@/types'

interface InvestmentPortfolioProps {
  investments: Investment[]
  currency: Currency
}

const typeLabels: Record<string, string> = {
  stock: 'Acción',
  bond: 'Bono',
  crypto: 'Crypto',
  fund: 'Fondo',
  cedear: 'CEDEAR',
  plazo_fijo: 'Plazo Fijo',
  other: 'Otro',
}

interface InvestmentFormData {
  name: string
  ticker: string
  type: string
  quantity: string
  purchase_price: string
  current_price: string
  purchase_date: string
  currency: Currency
  notes: string
}

const defaultForm: InvestmentFormData = {
  name: '',
  ticker: '',
  type: 'stock',
  quantity: '',
  purchase_price: '',
  current_price: '',
  purchase_date: new Date().toISOString().split('T')[0],
  currency: 'ARS',
  notes: '',
}

export function InvestmentPortfolio({ investments, currency }: InvestmentPortfolioProps) {
  const supabase = createClient()
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<InvestmentFormData>(defaultForm)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Portfolio metrics
  const totalInvested = investments.reduce((s, inv) => {
    if (inv.currency === currency) return s + inv.quantity * inv.purchase_price
    return s
  }, 0)

  const totalCurrentValue = investments.reduce((s, inv) => {
    if (inv.currency === currency) {
      const price = inv.current_price ?? inv.purchase_price
      return s + inv.quantity * price
    }
    return s
  }, 0)

  const totalPnL = totalCurrentValue - totalInvested
  const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('investments').insert({
      user_id: user.id,
      name: form.name,
      ticker: form.ticker || null,
      type: form.type,
      quantity: parseFloat(form.quantity),
      purchase_price: parseFloat(form.purchase_price),
      current_price: form.current_price ? parseFloat(form.current_price) : null,
      purchase_date: form.purchase_date || null,
      currency: form.currency,
      notes: form.notes || null,
    })

    setLoading(false)
    setShowModal(false)
    setForm(defaultForm)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta inversión?')) return
    setDeletingId(id)
    await supabase.from('investments').delete().eq('id', id)
    setDeletingId(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm text-slate-500">Capital invertido</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalInvested, currency)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Valor actual</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalCurrentValue, currency)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Resultado</p>
          <div className="flex items-center gap-2 mt-1">
            <p className={cn('text-2xl font-bold', totalPnL >= 0 ? 'text-emerald-600' : 'text-red-500')}>
              {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL, currency)}
            </p>
            <span className={cn('text-sm font-medium px-2 py-0.5 rounded-full', totalPnL >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
              {totalPnLPct >= 0 ? '+' : ''}{totalPnLPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Portfolio</h3>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </div>

        {investments.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingUp className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No hay inversiones registradas</p>
            <button onClick={() => setShowModal(true)} className="btn-primary mt-4 text-sm">
              Agregar primera inversión
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-left">
                  <th className="px-5 py-3 font-medium">Activo</th>
                  <th className="px-3 py-3 font-medium text-right">Cantidad</th>
                  <th className="px-3 py-3 font-medium text-right">P. compra</th>
                  <th className="px-3 py-3 font-medium text-right">P. actual</th>
                  <th className="px-3 py-3 font-medium text-right">Valor</th>
                  <th className="px-3 py-3 font-medium text-right">P&L</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {investments.map(inv => {
                  const currentPrice = inv.current_price ?? inv.purchase_price
                  const value = inv.quantity * currentPrice
                  const cost = inv.quantity * inv.purchase_price
                  const pnl = value - cost
                  const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-5 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{inv.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {inv.ticker && <span className="text-xs text-slate-400 font-mono">{inv.ticker}</span>}
                            <span className="text-xs text-slate-400">{typeLabels[inv.type]}</span>
                            <span className="text-xs text-slate-300">{inv.currency}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-slate-700">{inv.quantity}</td>
                      <td className="px-3 py-3 text-right text-slate-500">
                        {formatCurrency(inv.purchase_price, inv.currency as Currency)}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-700">
                        {inv.current_price
                          ? formatCurrency(inv.current_price, inv.currency as Currency)
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-slate-900">
                        {formatCurrency(value, inv.currency as Currency)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div>
                          <p className={cn('font-medium', pnl >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                            {pnl >= 0 ? '+' : ''}{formatCurrency(pnl, inv.currency as Currency)}
                          </p>
                          <p className={cn('text-xs', pnl >= 0 ? 'text-emerald-500' : 'text-red-400')}>
                            {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => handleDelete(inv.id)}
                          disabled={deletingId === inv.id}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 z-10 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-900 mb-5">Agregar inversión</h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="label">Nombre</label>
                  <input className="input" placeholder="Ej: YPF, Bitcoin, S&P 500" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Ticker <span className="text-slate-400 font-normal">(opcional)</span></label>
                  <input className="input" placeholder="YPF, BTC" value={form.ticker}
                    onChange={e => setForm(f => ({ ...f, ticker: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Tipo</label>
                  <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Cantidad</label>
                  <input className="input" type="number" step="any" placeholder="0" value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Moneda</label>
                  <select className="input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value as Currency }))}>
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <label className="label">Precio de compra</label>
                  <input className="input" type="number" step="any" placeholder="0.00" value={form.purchase_price}
                    onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Precio actual <span className="text-slate-400 font-normal">(opcional)</span></label>
                  <input className="input" type="number" step="any" placeholder="0.00" value={form.current_price}
                    onChange={e => setForm(f => ({ ...f, current_price: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="label">Fecha de compra</label>
                  <input className="input" type="date" value={form.purchase_date}
                    onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
