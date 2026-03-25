'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Crown, Shield, User, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { GroupMember, GroupRole } from '@/types'
import { cn } from '@/lib/utils'

interface MemberListProps {
  members: GroupMember[]
  groupId: string
  currentUserId: string
  myRole: GroupRole
}

const roleIcons = {
  owner: <Crown className="w-3.5 h-3.5 text-amber-500" />,
  admin: <Shield className="w-3.5 h-3.5 text-blue-500" />,
  member: <User className="w-3.5 h-3.5 text-slate-400" />,
}

const roleLabels: Record<GroupRole, string> = {
  owner: 'Propietario',
  admin: 'Admin',
  member: 'Miembro',
}

export function MemberList({ members, groupId, currentUserId, myRole }: MemberListProps) {
  const router = useRouter()
  const [removing, setRemoving] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ userId: string; name: string } | null>(null)

  async function handleRemove() {
    if (!confirm) return
    setRemoving(confirm.userId)

    await fetch(`/api/groups/${groupId}/members/${confirm.userId}`, {
      method: 'DELETE',
    })

    setConfirm(null)
    setRemoving(null)
    router.refresh()
  }

  const canManage = myRole === 'owner' || myRole === 'admin'

  return (
    <>
      <div className="divide-y divide-slate-100">
        {members.map(m => {
          const name = m.profile?.full_name ?? 'Usuario'
          const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
          const isSelf = m.user_id === currentUserId
          const canRemove = canManage && !isSelf && m.role !== 'owner'

          return (
            <div key={m.id} className="flex items-center gap-3 py-3 px-1 group">
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700 flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-slate-900 truncate">
                    {name}
                    {isSelf && <span className="text-slate-400 font-normal"> (vos)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {roleIcons[m.role]}
                  <span className="text-xs text-slate-400">{roleLabels[m.role]}</span>
                </div>
              </div>

              {canRemove && (
                <button
                  onClick={() => setConfirm({ userId: m.user_id, name })}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      <ConfirmDialog
        open={!!confirm}
        title="Eliminar miembro"
        message={`¿Querés eliminar a ${confirm?.name} del grupo?`}
        confirmLabel="Eliminar"
        destructive
        loading={!!removing}
        onConfirm={handleRemove}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}
