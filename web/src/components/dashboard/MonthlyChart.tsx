'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency, getMonthLabel } from '@/lib/utils'
import type { MonthlySummary, Currency } from '@/types'

interface MonthlyChartProps {
  data: MonthlySummary[]
  currency: Currency
}

export function MonthlyChart({ data, currency }: MonthlyChartProps) {
  if (data.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Evolución mensual</h3>
        <div className="text-center py-8 text-slate-400 text-sm">Sin datos para mostrar</div>
      </div>
    )
  }

  const chartData = data.map(d => ({
    name: getMonthLabel(d.month),
    Ingresos: d.income,
    Gastos: d.expenses,
    Ahorro: d.savings,
  }))

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-slate-900 mb-4">Evolución mensual</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barSize={16}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => formatCurrency(v, currency).replace(/[^0-9KkMm,.]/g, '').slice(0, 6)}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value, currency)}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Ingresos" fill="#10b981" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Gastos" fill="#ef4444" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
