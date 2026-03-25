'use client'

import Link from 'next/link'
import { Users, Crown, ChevronRight, User } from 'lucide-react'
import type { Group, GroupMember } from '@/types'
import { cn } from '@/lib/utils'

interface GroupCardProps {
  group: Group
  myRole: 'owner' | 'admin' | 'member'
  memberCount: number
}

const roleLabels = {
  owner: { label: 'Propietario', color: 'text-amber-600 bg-amber-50' },
  admin: { label: 'Admin', color: 'text-blue-600 bg-blue-50' },
  member: { label: 'Miembro', color: 'text-slate-600 bg-slate-100' },
}

export function GroupCard({ group, myRole, memberCount }: GroupCardProps) {
  const role = roleLabels[myRole]

  return (
    <Link
      href={`/groups/${group.id}`}
      className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
    >
      <div className={cn(
        'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
        group.is_individual ? 'bg-blue-100' : 'bg-primary-100'
      )}>
        {group.is_individual
          ? <User className="w-5 h-5 text-blue-600" />
          : <Users className="w-5 h-5 text-primary-600" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-slate-900 truncate">{group.name}</p>
          {group.is_individual && (
            <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full flex-shrink-0">Personal</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-slate-400">{memberCount} {memberCount === 1 ? 'miembro' : 'miembros'}</span>
          <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-full', role.color)}>
            {role.label}
          </span>
        </div>
        {group.description && (
          <p className="text-xs text-slate-400 mt-1 truncate">{group.description}</p>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
    </Link>
  )
}
