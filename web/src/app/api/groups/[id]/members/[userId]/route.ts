import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; userId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Must be owner/admin (or removing self)
  const { data: myMembership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', params.id)
    .eq('user_id', user.id)
    .single()

  const isSelf = params.userId === user.id
  const canManage = myMembership && ['owner', 'admin'].includes(myMembership.role)

  if (!isSelf && !canManage) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  // Cannot remove owner
  const { data: targetMember } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', params.id)
    .eq('user_id', params.userId)
    .single()

  if (targetMember?.role === 'owner') {
    return NextResponse.json({ error: 'No se puede eliminar al propietario' }, { status: 400 })
  }

  await supabase
    .from('group_members')
    .delete()
    .eq('group_id', params.id)
    .eq('user_id', params.userId)

  return NextResponse.json({ success: true })
}
