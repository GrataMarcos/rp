'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { CategorySummary, Currency } from '@/types'

interface CategoryChartProps {
  data: CategorySummary[]
  currency: Currency
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#64748b']

export function CategoryChart({ data, currency }: CategoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Gastos por categoría</h3>
        <div className="text-center py-8 text-slate-400 text-sm">Sin datos para mostrar</div>
      </div>
    )
  }

  const chartData = data.map((d, i) => ({
    name: `${d.emoji ?? ''} ${d.name}`,
    value: d.amount,
    percentage: d.percentage,
    color: COLORS[i % COLORS.length],
  }))

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-slate-900 mb-4">Gastos por categoría</h3>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value, currency)}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-3 space-y-1.5">
        {data.slice(0, 5).map((d, i) => (
          <div key={d.category_id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-slate-600 truncate">{d.emoji} {d.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-slate-400 text-xs">{d.percentage}%</span>
              <span className="text-slate-700 font-medium">{formatCurrency(d.amount, currency)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
