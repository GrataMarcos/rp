'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, Users, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface InvitationData {
  group: { id: string; name: string; description: string | null }
  email: string
}

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      const res = await fetch(`/api/invitations/${params.token}`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Invitación inválida')
      } else {
        const data = await res.json()
        setInvitation(data.invitation)
      }
      setLoading(false)
    }
    load()
  }, [params.token])

  async function handleAccept() {
    if (!user) {
      router.push(`/auth/login?redirect=/invite/${params.token}`)
      return
    }
    setAccepting(true)
    const res = await fetch(`/api/invitations/${params.token}`, { method: 'POST' })
    const data = await res.json()
    setAccepting(false)
    if (!res.ok) {
      setError(data.error ?? 'Error al aceptar la invitación')
    } else {
      setDone(true)
      setTimeout(() => router.push(`/groups/${data.group_id}`), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 backdrop-blur rounded-2xl mb-4">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">FinanzasYa</h1>
        </div>

        <div className="card p-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-6">
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <h2 className="font-semibold text-slate-900 mb-1">Invitación inválida</h2>
              <p className="text-sm text-slate-500 mb-5">{error}</p>
              <Link href="/dashboard" className="btn-primary">Ir al Dashboard</Link>
            </div>
          )}

          {!loading && done && (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h2 className="font-semibold text-slate-900 mb-1">¡Te uniste al grupo!</h2>
              <p className="text-sm text-slate-500">Redirigiendo...</p>
            </div>
          )}

          {!loading && !error && !done && invitation && (
            <>
              <div className="flex items-center gap-4 mb-5 p-4 bg-slate-50 rounded-xl">
                <div className="w-11 h-11 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{invitation.group.name}</p>
                  {invitation.group.description && (
                    <p className="text-sm text-slate-500">{invitation.group.description}</p>
                  )}
                </div>
              </div>

              <p className="text-sm text-slate-600 mb-5">
                Fuiste invitado a unirte a este grupo en FinanzasYa para hacer seguimiento de gastos compartidos.
              </p>

              {!user && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 mb-4">
                  Necesitás iniciar sesión para aceptar esta invitación.
                </div>
              )}

              <div className="flex gap-3">
                <Link href="/dashboard" className="btn-secondary flex-1 text-center">
                  Rechazar
                </Link>
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="btn-primary flex-1"
                >
                  {accepting ? 'Uniéndome...' : user ? 'Aceptar invitación' : 'Iniciar sesión y aceptar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
