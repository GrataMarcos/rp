'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AddTransactionModal } from './AddTransactionModal'
import { useRouter } from 'next/navigation'
import type { Category, Currency } from '@/types'

interface AddTransactionButtonProps {
  categories: Category[]
  currency: Currency
}

export function AddTransactionButton({ categories, currency }: AddTransactionButtonProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Nueva transacción</span>
        <span className="sm:hidden">Nueva</span>
      </button>

      <AddTransactionModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSuccess={() => router.refresh()}
        categories={categories}
        currency={currency}
      />
    </>
  )
}
