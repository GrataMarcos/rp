'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, RefreshCw, DollarSign, BarChart2, LineChart } from 'lucide-react'
import type { MarketData, MarketWidget } from '@/types'
import { cn } from '@/lib/utils'

interface MarketWidgetProps {
  widgets: MarketWidget[]
}

export function MarketWidget({ widgets }: MarketWidgetProps) {
  const [data, setData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch('/api/market')
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastUpdated(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15 * 60 * 1000) // refresh every 15 min
    return () => clearInterval(interval)
  }, [])

  if (!widgets.length) return null

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-900">Mercado</h2>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-slate-400">{lastUpdated}</span>
          )}
          <button
            onClick={fetchData}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {/* USD */}
          {widgets.includes('usd') && data?.usd && (
            <div className="p-3 bg-emerald-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Dólar</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <UsdRate label="Blue" value={data.usd.blue} />
                <UsdRate label="Oficial" value={data.usd.oficial} />
                <UsdRate label="MEP" value={data.usd.mep} />
              </div>
            </div>
          )}

          {/* Cauciones */}
          {widgets.includes('cauciones') && data?.cauciones && (
            <div className="p-3 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Cauciones BYMA</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <CaucionRate label="24hs" rate={data.cauciones.rate_24h} />
                <CaucionRate label="48hs" rate={data.cauciones.rate_48h} />
                <CaucionRate label="72hs" rate={data.cauciones.rate_72h} />
              </div>
            </div>
          )}

          {/* CEDEARs */}
          {widgets.includes('cedears') && data?.cedears && data.cedears.items.length > 0 && (
            <div className="p-3 bg-purple-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <LineChart className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">CEDEARs</span>
              </div>
              <div className="space-y-1.5">
                {data.cedears.items.slice(0, 5).map(c => (
                  <div key={c.ticker} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-purple-800 w-12">{c.ticker}</span>
                      <span className="text-xs text-slate-500 truncate max-w-[120px]">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-medium text-slate-900">${c.price.toLocaleString('es-AR')}</span>
                      <ChangeBadge pct={c.change_pct} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No data fallback */}
          {!data?.usd && !data?.cauciones && !data?.cedears && (
            <p className="text-sm text-slate-400 text-center py-4">
              No se pudo cargar datos de mercado
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function UsdRate({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-xs text-emerald-600 mb-0.5">{label}</p>
      <p className="font-bold text-slate-900 text-sm">${value.toLocaleString('es-AR')}</p>
    </div>
  )
}

function CaucionRate({ label, rate }: { label: string; rate: number }) {
  return (
    <div className="text-center">
      <p className="text-xs text-blue-600 mb-0.5">{label}</p>
      <p className="font-bold text-slate-900 text-sm">{rate.toFixed(1)}%</p>
    </div>
  )
}

function ChangeBadge({ pct }: { pct: number }) {
  const positive = pct > 0
  const neutral = pct === 0
  return (
    <span className={cn(
      'flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full',
      positive ? 'text-emerald-700 bg-emerald-100' :
      neutral ? 'text-slate-500 bg-slate-100' :
      'text-red-600 bg-red-100'
    )}>
      {positive ? <TrendingUp className="w-3 h-3" /> :
       neutral ? <Minus className="w-3 h-3" /> :
       <TrendingDown className="w-3 h-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}
