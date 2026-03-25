import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const supabase = createClient()

  const { data: invitation } = await supabase
    .from('group_invitations')
    .select('*, group:groups(id, name, description)')
    .eq('token', params.token)
    .single()

  if (!invitation) {
    return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
  }

  if (invitation.status !== 'pending') {
    return NextResponse.json({ error: 'Esta invitación ya fue usada', status: invitation.status }, { status: 410 })
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Esta invitación expiró' }, { status: 410 })
  }

  return NextResponse.json({ invitation })
}

export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión primero' }, { status: 401 })

  // Fetch invitation
  const { data: invitation } = await supabase
    .from('group_invitations')
    .select('*')
    .eq('token', params.token)
    .single()

  if (!invitation || invitation.status !== 'pending') {
    return NextResponse.json({ error: 'Invitación inválida o ya usada' }, { status: 400 })
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invitación expirada' }, { status: 400 })
  }

  // Add user to group (may already be a member)
  const { error: memberError } = await supabase
    .from('group_members')
    .upsert({ group_id: invitation.group_id, user_id: user.id, role: 'member' }, { onConflict: 'group_id,user_id' })

  if (memberError) {
    return NextResponse.json({ error: 'Error al unirse al grupo' }, { status: 500 })
  }

  // Mark invitation as accepted
  await supabase
    .from('group_invitations')
    .update({ status: 'accepted' })
    .eq('token', params.token)

  return NextResponse.json({ success: true, group_id: invitation.group_id })
}
