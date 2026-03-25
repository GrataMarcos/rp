'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Users } from 'lucide-react'
import Link from 'next/link'

export default function NewGroupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Create group
    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .insert({ name: name.trim(), description: description.trim() || null, created_by: user.id })
      .select()
      .single()

    if (groupErr || !group) {
      setError('Error al crear el grupo. Intentá de nuevo.')
      setLoading(false)
      return
    }

    // Add creator as owner
    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
      role: 'owner',
    })

    router.push(`/groups/${group.id}`)
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/groups" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nuevo grupo</h1>
          <p className="text-slate-500 text-sm mt-0.5">Creá un grupo para compartir gastos</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Grupo compartido</p>
            <p className="text-xs text-slate-400">Podés invitar miembros después de crearlo</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="label">Nombre del grupo *</label>
          <input
            type="text"
            className="input"
            placeholder="Ej: Familia García, Casa compartida..."
            value={name}
            onChange={e => setName(e.target.value)}
            required
            maxLength={60}
          />
        </div>

        <div>
          <label className="label">Descripción (opcional)</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Para qué es este grupo..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/groups" className="btn-secondary flex-1 text-center">
            Cancelar
          </Link>
          <button type="submit" disabled={loading || !name.trim()} className="btn-primary flex-1">
            {loading ? 'Creando...' : 'Crear grupo'}
          </button>
        </div>
      </form>
    </div>
  )
}
