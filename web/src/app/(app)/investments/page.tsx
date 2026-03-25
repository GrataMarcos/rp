import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InvestmentPortfolio } from '@/components/investments/InvestmentPortfolio'
import type { Profile, Investment } from '@/types'

export default async function InvestmentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  if (!profile) redirect('/auth/login')

  // Only avanzado users
  if (profile.experience_level !== 'avanzado') {
    redirect('/dashboard')
  }

  const { data: investments } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inversiones</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Seguimiento de tu portfolio con P&L en tiempo real
        </p>
      </div>

      <InvestmentPortfolio
        investments={(investments ?? []) as Investment[]}
        currency={profile.default_currency}
      />

      {/* Tip */}
      <div className="card p-4 bg-amber-50 border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>💡 Tip:</strong> Actualizá el precio actual de tus activos periódicamente para ver el P&L correcto.
          Próximamente: integración con APIs de precios en tiempo real (BYMA, Binance, Yahoo Finance).
        </p>
      </div>
    </div>
  )
}
