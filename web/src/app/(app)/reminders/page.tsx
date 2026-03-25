import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AddReminderButton } from '@/components/reminders/AddReminderButton'
import { ReminderList } from '@/components/reminders/ReminderList'
import type { Profile, Reminder, Group } from '@/types'

export default async function RemindersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  if (!profile) redirect('/auth/login')

  // Fetch user's reminders with group info
  const { data: reminders } = await supabase
    .from('reminders')
    .select('*, group:groups(id, name)')
    .eq('user_id', user.id)
    .order('next_due_date', { ascending: true, nullsFirst: false })

  // Fetch user's groups for the form
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group:groups(id, name, is_individual)')
    .eq('user_id', user.id)

  const groups = (memberships ?? [])
    .map(m => m.group as unknown as Group)
    .filter(Boolean)

  // Upcoming reminders (next 7 days)
  const today = new Date()
  const in7 = new Date(today)
  in7.setDate(in7.getDate() + 7)
  const todayStr = today.toISOString().split('T')[0]
  const in7Str = in7.toISOString().split('T')[0]

  const upcomingCount = (reminders ?? []).filter(r =>
    r.is_active && r.next_due_date && r.next_due_date >= todayStr && r.next_due_date <= in7Str
  ).length

  const overdueCount = (reminders ?? []).filter(r =>
    r.is_active && r.next_due_date && r.next_due_date < todayStr
  ).length

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recordatorios</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Fechas de vencimiento de servicios, alquileres, impuestos y más
          </p>
        </div>
        <AddReminderButton groups={groups} defaultCurrency={profile.default_currency} />
      </div>

      {/* Summary chips */}
      {(upcomingCount > 0 || overdueCount > 0) && (
        <div className="flex flex-wrap gap-2">
          {overdueCount > 0 && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
              {overdueCount} vencido{overdueCount > 1 ? 's' : ''}
            </span>
          )}
          {upcomingCount > 0 && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
              {upcomingCount} próximo{upcomingCount > 1 ? 's' : ''} (7 días)
            </span>
          )}
        </div>
      )}

      <ReminderList
        reminders={(reminders ?? []) as Reminder[]}
        groups={groups}
        defaultCurrency={profile.default_currency}
      />
    </div>
  )
}
