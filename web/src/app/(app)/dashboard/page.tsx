import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { CategoryChart } from '@/components/dashboard/CategoryChart'
import { MonthlyChart } from '@/components/dashboard/MonthlyChart'
import { AddTransactionButton } from '@/components/transactions/AddTransactionButton'
import type { Profile, Transaction, CategorySummary, MonthlySummary } from '@/types'
import { formatDate } from '@/lib/utils'

async function getDashboardData(userId: string, profile: Profile) {
  const supabase = createClient()
  const now = new Date()
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
  const currency = profile.default_currency

  // Current month transactions
  const { data: monthTxs } = await supabase
    .from('transactions')
    .select('*, category:categories(*)')
    .eq('user_id', userId)
    .eq('currency', currency)
    .gte('date', monthStart)
    .lte('date', monthEnd)
    .order('date', { ascending: false })

  const income = (monthTxs ?? []).filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = (monthTxs ?? []).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  // All-time savings
  const { data: allTxs } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', userId)
    .eq('currency', currency)

  const totalIncome = (allTxs ?? []).filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = (allTxs ?? []).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const savings = totalIncome - totalExpenses

  // Recent transactions
  const { data: recentTxs } = await supabase
    .from('transactions')
    .select('*, category:categories(*)')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(8)

  // Category breakdown (intermediate+)
  let categoryData: CategorySummary[] = []
  if (profile.experience_level !== 'basico' && monthTxs) {
    const expenseTxs = monthTxs.filter(t => t.type === 'expense')
    const totalExp = expenseTxs.reduce((s, t) => s + t.amount, 0)
    const catMap = new Map<string, CategorySummary>()

    for (const tx of expenseTxs) {
      const key = tx.category_id ?? 'sin-categoria'
      const existing = catMap.get(key)
      if (existing) {
        existing.amount += tx.amount
        existing.count++
      } else {
        catMap.set(key, {
          category_id: key,
          name: tx.category?.name ?? 'Sin categoría',
          emoji: tx.category?.emoji ?? null,
          amount: tx.amount,
          percentage: 0,
          count: 1,
        })
      }
    }

    categoryData = Array.from(catMap.values())
      .sort((a, b) => b.amount - a.amount)
      .map(c => ({ ...c, percentage: totalExp > 0 ? Math.round((c.amount / totalExp) * 100) : 0 }))
  }

  // Monthly trend (last 6 months, intermediate+)
  let monthlyData: MonthlySummary[] = []
  if (profile.experience_level !== 'basico') {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i)
      return { month: format(d, 'yyyy-MM'), start: format(startOfMonth(d), 'yyyy-MM-dd'), end: format(endOfMonth(d), 'yyyy-MM-dd') }
    })

    const { data: allMonthTxs } = await supabase
      .from('transactions')
      .select('type, amount, date')
      .eq('user_id', userId)
      .eq('currency', currency)
      .gte('date', months[0].start)
      .lte('date', months[5].end)

    monthlyData = months.map(m => {
      const txs = (allMonthTxs ?? []).filter(t => t.date >= m.start && t.date <= m.end)
      const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      return { month: m.month, income: inc, expenses: exp, savings: inc - exp }
    })
  }

  return { income, expenses, savings, recentTxs: recentTxs ?? [], categoryData, monthlyData }
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  if (!profile) redirect('/auth/login')

  const { income, expenses, savings, recentTxs, categoryData, monthlyData } = await getDashboardData(user.id, profile)

  const monthLabel = formatDate(format(new Date(), 'yyyy-MM-dd'), 'MMMM yyyy')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5 capitalize">{monthLabel}</p>
        </div>
        <AddTransactionButton
          categories={[]}
          currency={profile.default_currency}
        />
      </div>

      {/* Summary cards - all levels */}
      <SummaryCards
        income={income}
        expenses={expenses}
        savings={savings}
        currency={profile.default_currency}
        period={monthLabel}
      />

      {/* Charts - intermediate+ */}
      {profile.experience_level !== 'basico' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CategoryChart data={categoryData} currency={profile.default_currency} />
          <MonthlyChart data={monthlyData} currency={profile.default_currency} />
        </div>
      )}

      {/* Recent transactions - all levels */}
      <RecentTransactions
        transactions={recentTxs as Transaction[]}
        currency={profile.default_currency}
      />

      {/* WhatsApp tip */}
      <div className="card p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💬</span>
          <div>
            <p className="font-medium text-emerald-800 text-sm">Registrá por WhatsApp</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Mandá "gasté 5000 en el super" o una nota de voz a tu bot y se registra automáticamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
