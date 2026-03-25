'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ReminderForm } from './ReminderForm'
import type { Group, Currency } from '@/types'

interface AddReminderButtonProps {
  groups: Group[]
  defaultCurrency: Currency
}

export function AddReminderButton({ groups, defaultCurrency }: AddReminderButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Nuevo
      </button>
      {open && (
        <ReminderForm
          groups={groups}
          defaultCurrency={defaultCurrency}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
