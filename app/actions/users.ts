'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { logActivity } from '@/lib/audit/activity'
import { inviteLimiter } from '@/lib/auth/rate-limit'
import { inviteUserSchema } from '@/lib/validators/auth'

export async function inviteUserAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('users:invite')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const parsed = inviteUserSchema.safeParse({
    email: formData.get('email') as string,
    fullName: formData.get('fullName') as string,
    roleCode: formData.get('roleCode') as string,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  // Rate limit
  const { success: allowed } = await inviteLimiter.limit(`invite:${session.activeTenantId}`)
  if (!allowed) {
    return { error: 'Demasiadas invitaciones. Espera una hora.' }
  }

  const admin = createAdminClient()
  const { email, fullName, roleCode } = parsed.data

  // Create user in Supabase Auth
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (authError) {
    if (authError.message.includes('already been registered')) {
      return { error: 'El email ya esta registrado' }
    }
    return { error: 'Error al crear usuario' }
  }

  const userId = authData.user.id

  // Add membership
  await admin.from('user_tenant_memberships').insert({
    user_id: userId,
    tenant_id: session.activeTenantId,
  })

  // Assign role
  const { data: role } = await admin
    .from('roles')
    .select('id')
    .eq('tenant_id', session.activeTenantId)
    .eq('code', roleCode)
    .single()

  if (role) {
    await admin.from('user_roles').insert({
      user_id: userId,
      tenant_id: session.activeTenantId,
      role_id: role.id,
      assigned_by: session.userId,
    })
  }

  // Set 2FA required for non-student roles
  const requiresTwoFactor = ['super_admin', 'admin', 'coordinator', 'treasurer', 'teacher'].includes(roleCode)
  if (requiresTwoFactor) {
    await admin
      .from('user_profiles')
      .update({ two_factor_required: true })
      .eq('id', userId)
  }

  // Generate password reset link (acts as invitation link)
  const { data: linkData } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/activate`,
    },
  })

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'user.invited',
    resourceType: 'user',
    resourceId: userId,
    summary: `${fullName} (${email}) invitado como ${roleCode}`,
    metadata: { email, roleCode },
  })

  return { success: true, email }
}
