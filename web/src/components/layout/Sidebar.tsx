'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TrendingUp, LayoutDashboard, ArrowLeftRight, LineChart, Settings, LogOut, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { ExperienceLevel } from '@/types'

interface SidebarProps {
  level: ExperienceLevel
  userName: string | null
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, levels: ['basico', 'intermedio', 'avanzado'] },
  { href: '/transactions', label: 'Transacciones', icon: ArrowLeftRight, levels: ['basico', 'intermedio', 'avanzado'] },
  { href: '/investments', label: 'Inversiones', icon: LineChart, levels: ['avanzado'] },
  { href: '/settings', label: 'Configuración', icon: Settings, levels: ['basico', 'intermedio', 'avanzado'] },
]

const levelLabels: Record<ExperienceLevel, string> = {
  basico: 'Básico',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
}

const levelColors: Record<ExperienceLevel, string> = {
  basico: 'bg-blue-100 text-blue-700',
  intermedio: 'bg-amber-100 text-amber-700',
  avanzado: 'bg-purple-100 text-purple-700',
}

export function Sidebar({ level, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const initials = userName
    ? userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">FinanzasYa</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems
          .filter(item => item.levels.includes(level))
          .map(item => {
            const Icon = item.icon
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon className={cn('w-4 h-4', active ? 'text-primary-600' : 'text-slate-400')} />
                {item.label}
              </Link>
            )
          })}

        {/* WhatsApp integration hint */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm">
            <MessageCircle className="w-4 h-4 text-emerald-500" />
            <span className="font-medium">Bot de WhatsApp</span>
          </div>
          <p className="text-xs text-slate-400 px-3 mt-1">
            Registrá gastos por WhatsApp automáticamente
          </p>
        </div>
      </nav>

      {/* User */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-bold text-primary-700">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{userName ?? 'Usuario'}</p>
            <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-full', levelColors[level])}>
              {levelLabels[level]}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
