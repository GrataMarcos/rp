'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ArrowUpRight, ArrowDownRight, Trash2, Pencil, MessageCircle, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { Transaction, Category, Currency, Group } from '@/types'
import { format, subMonths } from 'date-fns'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EditTransactionModal } from './EditTransactionModal'

interface TransactionListProps {
  transactions: Transaction[]
  categories: Category[]
  groups: Group[]
  currency: Currency
  currentType: string
  currentMonth: string
}

export function TransactionList({ transactions, categories, groups, currency, currentType, currentMonth }: TransactionListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<Transaction | null>(null)

  // Generate last 6 months for filter
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), i)
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMM yyyy') }
  })

  function applyFilter(params: Record<string, string>) {
    const sp = new URLSearchParams()
    if (params.type && params.type !== 'all') sp.set('type', params.type)
    if (params.month) sp.set('month', params.month)
    router.push(`${pathname}?${sp.toString()}`)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    await supabase.from('transactions').delete().eq('id', deleteTarget.id)
    setDeletingId(null)
    setDeleteTarget(null)
    router.refresh()
  }

  // Group by date
  const grouped = transactions.reduce((acc, tx) => {
    const key = tx.date
    if (!acc[key]) acc[key] = []
    acc[key].push(tx)
    return acc
  }, {} as Record<string, Transaction[]>)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Filtros:</span>
          </div>

          {/* Type filter */}
          <div className="flex rounded-lg bg-slate-100 p-0.5">
            {[
              { value: 'all', label: 'Todos' },
              { value: 'income', label: '💰 Ingresos' },
              { value: 'expense', label: '💸 Gastos' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => applyFilter({ type: opt.value, month: currentMonth })}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  currentType === opt.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Month filter */}
          <select
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={currentMonth}
            onChange={e => applyFilter({ type: currentType, month: e.target.value })}
          >
            <option value="">Todos los meses</option>
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {transactions.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-400 text-sm">No hay transacciones con estos filtros</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, txs]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  {formatDate(date, "EEEE d 'de' MMMM")}
                </p>
                <div className="card divide-y divide-slate-100">
                  {txs.map(tx => (
                    <div key={tx.id} className="flex items-center gap-3 p-3.5 hover:bg-slate-50 transition-colors group">
                      {/* Icon */}
                      <div className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                        tx.type === 'income' ? 'bg-emerald-100' : 'bg-red-100'
                      )}>
                        {tx.category?.emoji ? (
                          <span className="text-base">{tx.category.emoji}</span>
                        ) : tx.type === 'income' ? (
                          <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-500" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {tx.description ?? tx.category?.name ?? (tx.type === 'income' ? 'Ingreso' : 'Gasto')}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {tx.category && (
                            <span className="text-xs text-slate-400">{tx.category.name}</span>
                          )}
                          {tx.source === 'whatsapp' && (
                            <span className="flex items-center gap-0.5 text-xs text-emerald-600">
                              <MessageCircle className="w-3 h-3" /> WhatsApp
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right flex-shrink-0">
                        <p className={cn(
                          'text-sm font-semibold',
                          tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'
                        )}>
                          {tx.type === 'income' ? '+' : '-'}
                          {formatCurrency(tx.amount, tx.currency as Currency)}
                        </p>
                        {tx.currency !== currency && (
                          <p className="text-xs text-slate-400">{tx.currency}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all ml-1">
                        <button
                          onClick={() => setEditTarget(tx)}
                          className="p-1.5 text-slate-300 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(tx)}
                          disabled={deletingId === tx.id}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <EditTransactionModal
          transaction={editTarget}
          categories={categories}
          groups={groups}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar transacción"
        message={`¿Eliminás "${deleteTarget?.description ?? (deleteTarget?.type === 'income' ? 'Ingreso' : 'Gasto')}" por ${deleteTarget ? formatCurrency(deleteTarget.amount, deleteTarget.currency as Currency) : ''}?`}
        confirmLabel="Eliminar"
        destructive
        loading={!!deletingId}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
