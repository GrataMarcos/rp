'use client'

import { useState } from 'react'
import { Menu, X, TrendingUp } from 'lucide-react'
import { Sidebar } from './Sidebar'
import type { ExperienceLevel } from '@/types'

interface MobileNavProps {
  level: ExperienceLevel
  userName: string | null
}

export function MobileNav({ level, userName }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Topbar */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900">FinanzasYa</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative flex w-64 flex-col">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 z-50 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar level={level} userName={userName} />
          </div>
        </div>
      )}
    </>
  )
}
