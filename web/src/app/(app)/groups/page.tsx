import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { GroupCard } from '@/components/groups/GroupCard'
import type { Group, GroupMember, GroupRole } from '@/types'

export default async function GroupsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get all groups the user belongs to, with member count
  const { data: memberships } = await supabase
    .from('group_members')
    .select(`
      role,
      group:groups (
        id, name, description, is_individual, created_at,
        members:group_members (id)
      )
    `)
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })

  const groups = (memberships ?? []).map(m => ({
    group: m.group as unknown as Group,
    myRole: m.role as GroupRole,
    memberCount: (m.group as any)?.members?.length ?? 0,
  }))

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Grupos</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Hacé seguimiento de gastos compartidos con familia o amigos
          </p>
        </div>
        <Link href="/groups/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo grupo
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-400 text-sm">No hay grupos todavía</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(({ group, myRole, memberCount }) => group && (
            <GroupCard
              key={group.id}
              group={group}
              myRole={myRole}
              memberCount={memberCount}
            />
          ))}
        </div>
      )}
    </div>
  )
}
