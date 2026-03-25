import { TrendingUp, TrendingDown, PiggyBank, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Currency } from '@/types'

interface SummaryCardsProps {
  income: number
  expenses: number
  savings: number
  currency: Currency
  period: string
}

export function SummaryCards({ income, expenses, savings, currency, period }: SummaryCardsProps) {
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0

  const cards = [
    {
      title: 'Ingresos',
      subtitle: period,
      value: income,
      icon: TrendingUp,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-600',
    },
    {
      title: 'Gastos',
      subtitle: period,
      value: expenses,
      icon: TrendingDown,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-500',
      valueColor: 'text-red-500',
    },
    {
      title: 'Ahorro acumulado',
      subtitle: 'Histórico total',
      value: savings,
      icon: PiggyBank,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      valueColor: savings >= 0 ? 'text-blue-600' : 'text-red-500',
    },
    {
      title: 'Tasa de ahorro',
      subtitle: `${period} · ${income > 0 ? savingsRate + '%' : 'Sin datos'}`,
      value: null,
      icon: Wallet,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      valueColor: 'text-purple-600',
      extra: `${income - expenses >= 0 ? '+' : ''}${formatCurrency(income - expenses, currency)} este mes`,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map(card => {
        const Icon = card.icon
        return (
          <div key={card.title} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-slate-500">{card.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{card.subtitle}</p>
              </div>
              <div className={`w-10 h-10 ${card.iconBg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
            </div>
            {card.value !== null ? (
              <p className={`text-2xl font-bold ${card.valueColor}`}>
                {formatCurrency(card.value, currency)}
              </p>
            ) : (
              <>
                <p className={`text-2xl font-bold ${card.valueColor}`}>
                  {income > 0 ? `${savingsRate}%` : '—'}
                </p>
                <p className="text-xs text-slate-400 mt-1">{card.extra}</p>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
