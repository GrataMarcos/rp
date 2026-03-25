'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CheckCircle, Save, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExperienceLevel, Currency, Profile } from '@/types'

const levels: { id: ExperienceLevel; title: string; emoji: string; desc: string }[] = [
  { id: 'basico', title: 'Básico', emoji: '🌱', desc: 'Solo lo esencial: ingresos, gastos y ahorro' },
  { id: 'intermedio', title: 'Intermedio', emoji: '📊', desc: 'Categorías, gráficos y evolución mensual' },
  { id: 'avanzado', title: 'Avanzado', emoji: '🚀', desc: 'Todo + portfolio de inversiones' },
]

const currencies: { id: Currency; label: string }[] = [
  { id: 'ARS', label: 'Peso argentino (ARS)' },
  { id: 'USD', label: 'Dólar (USD)' },
  { id: 'EUR', label: 'Euro (EUR)' },
]

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [level, setLevel] = useState<ExperienceLevel>('basico')
  const [currency, setCurrency] = useState<Currency>('ARS')
  const [fullName, setFullName] = useState('')
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        setLevel(data.experience_level)
        setCurrency(data.default_currency)
        setFullName(data.full_name ?? '')
        setWhatsappPhone(data.whatsapp_phone ?? '')
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({
      experience_level: level,
      default_currency: currency,
      full_name: fullName || null,
      whatsapp_phone: whatsappPhone || null,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="text-slate-500 text-sm mt-0.5">Personalizá tu experiencia en la app</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal info */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Información personal</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Nombre completo</label>
              <input
                type="text"
                className="input"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>
          </div>
        </div>

        {/* Experience level */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-1">Nivel de experiencia</h2>
          <p className="text-sm text-slate-500 mb-4">Define cuánto detalle ves en la app</p>
          <div className="space-y-2">
            {levels.map(l => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLevel(l.id)}
                className={cn(
                  'w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between',
                  level === l.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{l.emoji}</span>
                  <div>
                    <span className="font-medium text-slate-900">{l.title}</span>
                    <p className="text-sm text-slate-500">{l.desc}</p>
                  </div>
                </div>
                {level === l.id && <CheckCircle className="w-5 h-5 text-primary-600" />}
              </button>
            ))}
          </div>
        </div>

        {/* Currency */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-1">Moneda principal</h2>
          <p className="text-sm text-slate-500 mb-4">Usada por defecto en nuevas transacciones</p>
          <div className="space-y-2">
            {currencies.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCurrency(c.id)}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-between',
                  currency === c.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <span className="font-medium text-slate-700">{c.label}</span>
                {currency === c.id && <CheckCircle className="w-4 h-4 text-primary-600" />}
              </button>
            ))}
          </div>
        </div>

        {/* WhatsApp */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="w-5 h-5 text-emerald-500" />
            <h2 className="font-semibold text-slate-900">Bot de WhatsApp</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Registrá gastos e ingresos enviando un mensaje o nota de voz
          </p>
          <div>
            <label className="label">Tu número de WhatsApp</label>
            <input
              type="tel"
              className="input"
              value={whatsappPhone}
              onChange={e => setWhatsappPhone(e.target.value)}
              placeholder="+54 9 11 1234-5678"
            />
            <p className="text-xs text-slate-400 mt-1">
              Incluí el código de país. Con este número te va a reconocer el bot.
            </p>
          </div>

          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-sm font-medium text-emerald-800 mb-2">¿Cómo funciona?</p>
            <ul className="space-y-1.5 text-sm text-emerald-700">
              <li className="flex items-start gap-2">
                <span>1.</span>
                <span>Guardá el número del bot en tus contactos</span>
              </li>
              <li className="flex items-start gap-2">
                <span>2.</span>
                <span>Mandá un mensaje: <em>"gasté 5000 en el super"</em></span>
              </li>
              <li className="flex items-start gap-2">
                <span>3.</span>
                <span>El bot confirma y guarda automáticamente</span>
              </li>
              <li className="flex items-start gap-2">
                <span>4.</span>
                <span>También podés mandar notas de voz</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {saved && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Cambios guardados
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
