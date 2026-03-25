import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Settings, UserPlus } from 'lucide-react'
import { MemberList } from '@/components/groups/MemberList'
import { InviteForm } from '@/components/groups/InviteForm'
import type { Group, GroupMember, GroupRole } from '@/types'

export default async function GroupDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch group
  const { data: group } = await supabase
    .from('groups')
    .select('*')
    .eq('id', params.id)
    .single() as { data: Group | null }

  if (!group) notFound()

  // Fetch members with profiles
  const { data: members } = await supabase
    .from('group_members')
    .select('*, profile:profiles(id, full_name, whatsapp_phone)')
    .eq('group_id', params.id)
    .order('joined_at', { ascending: true })

  const typedMembers = (members ?? []) as GroupMember[]
  const myMembership = typedMembers.find(m => m.user_id === user.id)

  if (!myMembership) redirect('/groups')

  const myRole = myMembership.role as GroupRole
  const canManage = myRole === 'owner' || myRole === 'admin'

  // Fetch pending invitations
  const { data: invitations } = await supabase
    .from('group_invitations')
    .select('id, email, status, created_at, expires_at')
    .eq('group_id', params.id)
    .eq('status', 'pending')
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  // Recent group transactions count
  const { count } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', params.id)

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/groups" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{group.name}</h1>
          {group.description && (
            <p className="text-slate-500 text-sm mt-0.5">{group.description}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{typedMembers.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">Miembros</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{count ?? 0}</p>
          <p className="text-xs text-slate-400 mt-0.5">Transacciones</p>
        </div>
      </div>

      {/* Members */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Miembros</h2>
        <MemberList
          members={typedMembers}
          groupId={group.id}
          currentUserId={user.id}
          myRole={myRole}
        />
      </div>

      {/* Invite (owners/admins only, non-individual groups) */}
      {canManage && !group.is_individual && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-primary-600" />
            <h2 className="font-semibold text-slate-900">Invitar miembro</h2>
          </div>
          <InviteForm groupId={group.id} groupName={group.name} />

          {/* Pending invites */}
          {(invitations ?? []).length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Invitaciones pendientes
              </p>
              <div className="space-y-2">
                {(invitations ?? []).map(inv => (
                  <div key={inv.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{inv.email}</span>
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pendiente</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transactions link */}
      <div className="card p-4 bg-slate-50">
        <p className="text-sm text-slate-600">
          Podés filtrar las transacciones de este grupo desde la sección{' '}
          <Link href={`/transactions?group=${group.id}`} className="text-primary-600 font-medium hover:underline">
            Transacciones
          </Link>.
        </p>
      </div>
    </div>
  )
}
