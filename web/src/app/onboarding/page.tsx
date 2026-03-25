'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExperienceLevel, Currency } from '@/types'

const levels: { id: ExperienceLevel; title: string; desc: string; emoji: string; features: string[] }[] = [
  {
    id: 'basico',
    title: 'Básico',
    emoji: '🌱',
    desc: 'Quiero entender mis números sin complicarme',
    features: ['Total de ingresos y gastos', 'Balance de ahorro', 'Últimas transacciones'],
  },
  {
    id: 'intermedio',
    title: 'Intermedio',
    emoji: '📊',
    desc: 'Ya entiendo las finanzas y quiero más detalle',
    features: ['Todo lo básico', 'Breakdown por categorías', 'Evolución mensual', 'Metas de ahorro'],
  },
  {
    id: 'avanzado',
    title: 'Avanzado',
    emoji: '🚀',
    desc: 'Quiero control total, incluyendo inversiones',
    features: ['Todo lo intermedio', 'Portfolio de inversiones', 'Valor de mercado en tiempo real', 'Analytics avanzados'],
  },
]

const currencies: { id: Currency; label: string; symbol: string }[] = [
  { id: 'ARS', label: 'Peso argentino', symbol: '$' },
  { id: 'USD', label: 'Dólar estadounidense', symbol: 'US$' },
  { id: 'EUR', label: 'Euro', symbol: '€' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel>('basico')
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('ARS')
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleFinish() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name ?? null,
      experience_level: selectedLevel,
      default_currency: selectedCurrency,
      whatsapp_phone: whatsappPhone || null,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })

    // Seed default categories for new user
    await seedDefaultCategories(user.id)

    router.push('/dashboard')
  }

  async function seedDefaultCategories(userId: string) {
    const defaults = [
      { name: 'Comida y Restaurantes', emoji: '🍔', type: 'expense', color: '#f97316' },
      { name: 'Supermercado', emoji: '🛒', type: 'expense', color: '#84cc16' },
      { name: 'Transporte', emoji: '🚗', type: 'expense', color: '#0ea5e9' },
      { name: 'Hogar y Casa', emoji: '🏠', type: 'expense', color: '#8b5cf6' },
      { name: 'Salud y Farmacia', emoji: '💊', type: 'expense', color: '#ec4899' },
      { name: 'Entretenimiento', emoji: '🎮', type: 'expense', color: '#f59e0b' },
      { name: 'Ropa y Accesorios', emoji: '👕', type: 'expense', color: '#6366f1' },
      { name: 'Educación', emoji: '📚', type: 'expense', color: '#14b8a6' },
      { name: 'Servicios y Suscripciones', emoji: '🔧', type: 'expense', color: '#64748b' },
      { name: 'Trabajo y Negocios', emoji: '💼', type: 'expense', color: '#0d9488' },
      { name: 'Viajes y Turismo', emoji: '✈️', type: 'expense', color: '#06b6d4' },
      { name: 'Otros gastos', emoji: '❓', type: 'expense', color: '#94a3b8' },
      { name: 'Sueldo', emoji: '💰', type: 'income', color: '#10b981' },
      { name: 'Freelance', emoji: '💻', type: 'income', color: '#3b82f6' },
      { name: 'Inversiones', emoji: '📈', type: 'income', color: '#8b5cf6' },
      { name: 'Otros ingresos', emoji: '🎁', type: 'income', color: '#f59e0b' },
    ]
    await supabase.from('categories').insert(
      defaults.map(c => ({ ...c, user_id: userId, is_default: true }))
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-2xl mb-3">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Bienvenido a FinanzasYa</h1>
          <p className="text-primary-200 mt-1">Configuremos tu cuenta — solo tarda 1 minuto</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          {[1, 2, 3].map(s => (
            <div key={s} className={cn(
              'h-2 rounded-full transition-all',
              s === step ? 'w-8 bg-white' : s < step ? 'w-4 bg-white/70' : 'w-4 bg-white/30'
            )} />
          ))}
        </div>

        <div className="card p-6">
          {/* Step 1: Experience level */}
          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">¿Cómo sos con las finanzas?</h2>
              <p className="text-sm text-slate-500 mb-5">Esto define qué tan detallada es la app para vos. Podés cambiarlo después.</p>
              <div className="grid gap-3">
                {levels.map(l => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedLevel(l.id)}
                    className={cn(
                      'w-full text-left p-4 rounded-xl border-2 transition-all',
                      selectedLevel === l.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{l.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">{l.title}</span>
                          {selectedLevel === l.id && <CheckCircle className="w-4 h-4 text-primary-600" />}
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">{l.desc}</p>
                        <ul className="mt-2 space-y-0.5">
                          {l.features.map(f => (
                            <li key={f} className="text-xs text-slate-500 flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-slate-400" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="btn-primary w-full mt-5">
                Siguiente
              </button>
            </>
          )}

          {/* Step 2: Currency */}
          {step === 2 && (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">¿Cuál es tu moneda principal?</h2>
              <p className="text-sm text-slate-500 mb-5">Usada por defecto en todos tus registros. Podés usar otras también.</p>
              <div className="grid gap-3">
                {currencies.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCurrency(c.id)}
                    className={cn(
                      'w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between',
                      selectedCurrency === c.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-slate-400 w-8">{c.symbol}</span>
                      <div>
                        <span className="font-semibold text-slate-900">{c.id}</span>
                        <p className="text-sm text-slate-500">{c.label}</p>
                      </div>
                    </div>
                    {selectedCurrency === c.id && <CheckCircle className="w-4 h-4 text-primary-600" />}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">Atrás</button>
                <button onClick={() => setStep(3)} className="btn-primary flex-1">Siguiente</button>
              </div>
            </>
          )}

          {/* Step 3: WhatsApp */}
          {step === 3 && (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Conectá tu WhatsApp</h2>
              <p className="text-sm text-slate-500 mb-5">
                Registrá gastos e ingresos directamente desde WhatsApp con lenguaje natural.
                Podés configurarlo después.
              </p>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💬</span>
                  <div>
                    <p className="font-medium text-emerald-800 text-sm">Así funciona:</p>
                    <ul className="mt-1 space-y-1 text-xs text-emerald-700">
                      <li>• Mandás "gasté 5000 en el super"</li>
                      <li>• El bot lo registra automáticamente</li>
                      <li>• También acepta notas de voz</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Tu número de WhatsApp</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="+54 9 11 1234-5678"
                  value={whatsappPhone}
                  onChange={e => setWhatsappPhone(e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">Incluí el código de país. Ej: +54 para Argentina.</p>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1">Atrás</button>
                <button onClick={handleFinish} disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Guardando...' : 'Empezar →'}
                </button>
              </div>
              <button
                onClick={handleFinish}
                disabled={loading}
                className="w-full text-center text-sm text-slate-400 hover:text-slate-600 mt-3"
              >
                Omitir por ahora
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
