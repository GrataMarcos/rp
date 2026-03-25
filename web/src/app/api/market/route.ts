import { NextResponse } from 'next/server'
import type { MarketData } from '@/types'

// Simple in-memory cache (resets on cold start)
let cache: { data: MarketData; ts: number } | null = null
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

async function fetchUsd(): Promise<MarketData['usd'] | undefined> {
  try {
    // dolarito.ar — free, no auth required
    const res = await fetch('https://dolarito.ar/api/frontend/dolar', {
      next: { revalidate: 900 },
    })
    if (!res.ok) throw new Error('USD fetch failed')
    const data = await res.json()

    // dolarito returns an array of rates
    const find = (name: string) =>
      data.find((d: any) => d.nombre?.toLowerCase().includes(name))?.venta ?? 0

    return {
      blue: find('blue'),
      oficial: find('oficial'),
      mep: find('bolsa') || find('mep'),
      updated_at: new Date().toISOString(),
    }
  } catch {
    // Fallback: static placeholder
    return undefined
  }
}

async function fetchCauciones(): Promise<MarketData['cauciones'] | undefined> {
  try {
    // BYMA public endpoint for overnight/short-term rates
    const res = await fetch('https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/cauciones', {
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error('Cauciones fetch failed')
    const data = await res.json()

    // Parse rates — structure may vary, defensive extraction
    const get = (days: number) => {
      const row = data?.content?.find((r: any) => r.plazo === days)
      return row ? parseFloat(row.tasa ?? row.rate ?? 0) : 0
    }

    return {
      rate_24h: get(1) || get(24),
      rate_48h: get(2) || get(48),
      rate_72h: get(3) || get(72),
      updated_at: new Date().toISOString(),
    }
  } catch {
    return undefined
  }
}

async function fetchCedears(): Promise<MarketData['cedears'] | undefined> {
  try {
    // BYMA public endpoint for top CEDEARs
    const res = await fetch('https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/cedears', {
      next: { revalidate: 900 },
    })
    if (!res.ok) throw new Error('CEDEARs fetch failed')
    const data = await res.json()

    const items = (data?.content ?? [])
      .slice(0, 10)
      .map((c: any) => ({
        ticker: c.simbolo ?? c.ticker ?? '',
        name: c.descripcion ?? c.name ?? '',
        price: parseFloat(c.ultimo ?? c.price ?? 0),
        change_pct: parseFloat(c.variacion ?? c.change ?? 0),
      }))
      .filter((c: any) => c.ticker)

    return { items, updated_at: new Date().toISOString() }
  } catch {
    return undefined
  }
}

export async function GET() {
  // Return cache if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(cache.data)
  }

  // Fetch all in parallel
  const [usd, cauciones, cedears] = await Promise.all([
    fetchUsd(),
    fetchCauciones(),
    fetchCedears(),
  ])

  const data: MarketData = {}
  if (usd) data.usd = usd
  if (cauciones) data.cauciones = cauciones
  if (cedears) data.cedears = cedears

  cache = { data, ts: Date.now() }

  return NextResponse.json(data)
}
