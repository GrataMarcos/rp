import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TransactionList } from '@/components/transactions/TransactionList'
import { AddTransactionButton } from '@/components/transactions/AddTransactionButton'
import type { Profile, Transaction, Category, Group } from '@/types'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { type?: string; month?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  if (!profile) redirect('/auth/login')

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  const { data: memberships } = await supabase
    .from('group_members')
    .select('group:groups(id, name, is_individual)')
    .eq('user_id', user.id)
  const groups = (memberships ?? []).map(m => m.group as unknown as Group).filter(Boolean)

  // Build query
  let query = supabase
    .from('transactions')
    .select('*, category:categories(*)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  if (searchParams.type && searchParams.type !== 'all') {
    query = query.eq('type', searchParams.type)
  }

  if (searchParams.month) {
    const [year, month] = searchParams.month.split('-')
    const start = `${year}-${month}-01`
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    const end = `${year}-${month}-${lastDay}`
    query = query.gte('date', start).lte('date', end)
  }

  const { data: transactions } = await query

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transacciones</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {transactions?.length ?? 0} registros encontrados
          </p>
        </div>
        <AddTransactionButton
          categories={(categories ?? []) as Category[]}
          currency={profile.default_currency}
        />
      </div>

      <TransactionList
        transactions={(transactions ?? []) as Transaction[]}
        categories={(categories ?? []) as Category[]}
        groups={groups}
        currency={profile.default_currency}
        currentType={searchParams.type ?? 'all'}
        currentMonth={searchParams.month ?? ''}
      />
    </div>
  )
}
