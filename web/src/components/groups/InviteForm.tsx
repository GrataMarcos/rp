'use client'

import { useState } from 'react'
import { Mail, Send, CheckCircle, AlertCircle } from 'lucide-react'

interface InviteFormProps {
  groupId: string
  groupName: string
}

export function InviteForm({ groupId, groupName }: InviteFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    const res = await fetch(`/api/groups/${groupId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Error al enviar la invitación')
    } else {
      setSuccess(true)
      setEmail('')
      setTimeout(() => setSuccess(false), 4000)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-slate-500">
        Enviá un link de invitación a <strong>{groupName}</strong> por email.
      </p>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Invitación enviada correctamente
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email@ejemplo.com"
            required
            className="input pl-9 w-full"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !email}
          className="btn-primary flex items-center gap-2 px-4"
        >
          <Send className="w-4 h-4" />
          {loading ? 'Enviando...' : 'Invitar'}
        </button>
      </div>
    </form>
  )
}
