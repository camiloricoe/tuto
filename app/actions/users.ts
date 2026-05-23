'use server'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { logActivity } from '@/lib/audit/activity'
import { inviteLimiter } from '@/lib/auth/rate-limit'
import {
  inviteUserSchema,
  updateUserProfileSchema,
} from '@/lib/validators/auth'

export async function inviteUserAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('users:invite')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const parsed = inviteUserSchema.safeParse({
    email: formData.get('email'),
    fullName: formData.get('fullName'),
    roleCode: formData.get('roleCode'),
    documentType: formData.get('documentType'),
    documentNumber: formData.get('documentNumber'),
    phone: formData.get('phone'),
    phoneType: formData.get('phoneType'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const { success: allowed } = await inviteLimiter.limit(
    `invite:${session.activeTenantId}`,
  )
  if (!allowed) {
    return { error: 'Demasiadas invitaciones. Espera una hora.' }
  }

  const admin = createAdminClient()
  const {
    email,
    fullName,
    roleCode,
    documentType,
    documentNumber,
    phone,
    phoneType,
  } = parsed.data

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
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

  await admin.from('user_tenant_memberships').insert({
    user_id: userId,
    tenant_id: session.activeTenantId,
  })

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

  const requiresTwoFactor = [
    'super_admin',
    'admin',
    'coordinator',
    'treasurer',
    'teacher',
  ].includes(roleCode)

  await admin
    .from('user_profiles')
    .update({
      full_name: fullName,
      document_type: documentType ?? null,
      document_number: documentNumber ?? null,
      phone: phone ?? null,
      phone_type: phoneType ?? null,
      ...(requiresTwoFactor ? { two_factor_required: true } : {}),
    })
    .eq('id', userId)

  await admin.auth.admin.generateLink({
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

  revalidatePath('/a/users')

  return { success: true, email }
}

export async function updateUserProfileAction(
  _prevState: unknown,
  formData: FormData,
) {
  const session = await requireSession()
  await requirePermission('users:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const userId = formData.get('userId')
  if (typeof userId !== 'string' || !userId) {
    return { error: 'Usuario inválido' }
  }

  const parsed = updateUserProfileSchema.safeParse({
    fullName: formData.get('fullName'),
    documentType: formData.get('documentType'),
    documentNumber: formData.get('documentNumber'),
    phone: formData.get('phone'),
    phoneType: formData.get('phoneType'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()

  const { data: membership } = await admin
    .from('user_tenant_memberships')
    .select('user_id, active')
    .eq('tenant_id', session.activeTenantId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!membership || !membership.active) {
    return { error: 'Usuario no pertenece a este tenant' }
  }

  const { fullName, documentType, documentNumber, phone, phoneType } =
    parsed.data

  const { error: updateError } = await admin
    .from('user_profiles')
    .update({
      full_name: fullName,
      document_type: documentType ?? null,
      document_number: documentNumber ?? null,
      phone: phone ?? null,
      phone_type: phoneType ?? null,
    })
    .eq('id', userId)

  if (updateError) {
    return { error: 'Error al actualizar perfil' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'user.profile_updated',
    resourceType: 'user',
    resourceId: userId,
    summary: `Perfil actualizado: ${fullName}`,
    metadata: {
      documentType: documentType ?? null,
      phoneType: phoneType ?? null,
    },
  })

  revalidatePath(`/a/users/${userId}`)
  revalidatePath('/a/users')

  return { success: true }
}
