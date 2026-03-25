import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

// We use Resend for email. If not configured, we log the link instead.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

  // Check user is owner/admin of this group
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  // Check if already a member
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone_number', email)
    .maybeSingle()

  // Create invitation
  const { data: invitation, error } = await supabase
    .from('group_invitations')
    .insert({
      group_id: params.id,
      invited_by: user.id,
      email: email.toLowerCase().trim(),
    })
    .select('token, group:groups(name)')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Error al crear invitación' }, { status: 500 })
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/invite/${invitation.token}`
  const groupName = (invitation.group as any)?.name ?? 'el grupo'

  // Send email if Resend is configured
  if (resend) {
    await resend.emails.send({
      from: 'FinanzasYa <noreply@finanzasya.app>',
      to: email,
      subject: `Te invitaron a unirte a ${groupName} en FinanzasYa`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1e293b;">Invitación a ${groupName}</h2>
          <p style="color: #64748b;">Alguien te invitó a unirte al grupo <strong>${groupName}</strong> en FinanzasYa para hacer seguimiento de gastos compartidos.</p>
          <a href="${inviteUrl}" style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">
            Aceptar invitación
          </a>
          <p style="color: #94a3b8; font-size: 12px;">Este link expira en 7 días. Si no esperabas esta invitación, podés ignorar este email.</p>
        </div>
      `,
    })
  } else {
    // Log the link for development
    console.log(`[INVITE] Link para ${email}: ${inviteUrl}`)
  }

  return NextResponse.json({ success: true })
}
