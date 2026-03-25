import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && user) {
      // Ensure profile exists (created by trigger, but fallback here)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, onboarding_completed')
        .eq('id', user.id)
        .single()

      if (!profile) {
        await supabase.from('profiles').insert({
          id: user.id,
          full_name: user.user_metadata?.full_name ?? null,
          experience_level: 'basico',
          default_currency: 'ARS',
          onboarding_completed: false,
        })
        return NextResponse.redirect(new URL('/onboarding', url.origin))
      }

      if (!profile.onboarding_completed) {
        return NextResponse.redirect(new URL('/onboarding', url.origin))
      }

      return NextResponse.redirect(new URL(next, url.origin))
    }
  }

  return NextResponse.redirect(new URL('/auth/login?error=auth_failed', url.origin))
}
