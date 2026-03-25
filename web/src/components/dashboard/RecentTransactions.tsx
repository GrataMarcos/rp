import Link from 'next/link'
import { ArrowUpRight, ArrowDownRight, MessageCircle } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Transaction, Currency } from '@/types'

interface RecentTransactionsProps {
  transactions: Transaction[]
  currency: Currency
}

export function RecentTransactions({ transactions, currency }: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Últimas transacciones</h3>
        <div className="text-center py-8">
          <p className="text-slate-400 text-sm">No hay transacciones aún</p>
          <p className="text-slate-300 text-xs mt-1">
            Agregá tu primer ingreso o gasto
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Últimas transacciones</h3>
        <Link href="/transactions" className="text-sm text-primary-600 hover:underline">
          Ver todas
        </Link>
      </div>

      <div className="space-y-1">
        {transactions.map(tx => (
          <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
            {/* Icon */}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
              tx.type === 'income' ? 'bg-emerald-100' : 'bg-red-100'
            }`}>
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
                <p className="text-xs text-slate-400">{formatDate(tx.date, 'd MMM')}</p>
                {tx.source === 'whatsapp' && (
                  <span className="flex items-center gap-0.5 text-xs text-emerald-600">
                    <MessageCircle className="w-3 h-3" /> WA
                  </span>
                )}
                {tx.category && (
                  <span className="text-xs text-slate-400">{tx.category.name}</span>
                )}
              </div>
            </div>

            {/* Amount */}
            <p className={`text-sm font-semibold flex-shrink-0 ${
              tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'
            }`}>
              {tx.type === 'income' ? '+' : '-'}
              {formatCurrency(tx.amount, tx.currency as Currency)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
