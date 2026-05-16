'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'

import { requireSession } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/audit/activity'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const inviteSchema = z.object({
  email: z.string().email('Email invalido'),
  roleCode: z.enum(['admin', 'coordinator', 'treasurer', 'teacher', 'student']),
  fullName: z.string().trim().max(120).optional(),
})

export type TenantUserActionResult =
  | { success: true; message?: string }
  | { error: string }

async function requireTenantAdmin(tenantId: string) {
  const session = await requireSession()
  if (!UUID_RE.test(tenantId)) {
    throw new Error('tenantId invalido')
  }
  if (session.isSuperAdmin) return session

  const admin = createAdminClient()
  const { data } = await admin
    .from('user_roles')
    .select('id, roles!inner(code)')
    .eq('user_id', session.userId)
    .eq('tenant_id', tenantId)
    .is('revoked_at', null)
    .limit(20)

  type Row = { id: string; roles: { code: string } | { code: string }[] }
  const codes = ((data ?? []) as Row[]).flatMap((r) => {
    const rs = Array.isArray(r.roles) ? r.roles : [r.roles]
    return rs.map((x) => x?.code).filter(Boolean) as string[]
  })

  if (!codes.includes('admin') && !codes.includes('super_admin')) {
    throw new Error('No tienes permiso para administrar este tenant')
  }
  return session
}

async function findOrInviteUser(
  email: string,
  fullName: string | undefined,
): Promise<{ id: string; created: boolean }> {
  const admin = createAdminClient()

  // Look up by email in auth.users via admin API
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (existing) return { id: existing.id, created: false }

  // Invite (sends signup email if Supabase email is configured; otherwise creates a user)
  const { data: invited, error: inviteErr } =
    await admin.auth.admin.inviteUserByEmail(email, {
      data: fullName ? { full_name: fullName } : undefined,
    })
  if (inviteErr || !invited?.user) {
    throw new Error(inviteErr?.message || 'No se pudo invitar al usuario')
  }
  return { id: invited.user.id, created: true }
}

export async function inviteTenantAdminAction(
  _prev: unknown,
  formData: FormData,
): Promise<TenantUserActionResult> {
  try {
    const tenantId = (formData.get('tenantId') as string | null)?.trim() ?? ''
    const session = await requireTenantAdmin(tenantId)

    const parsed = inviteSchema.safeParse({
      email: formData.get('email'),
      roleCode: formData.get('roleCode'),
      fullName: formData.get('fullName') || undefined,
    })
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
    }

    const admin = createAdminClient()

    // Resolve target role for this tenant by code
    const { data: role } = await admin
      .from('roles')
      .select('id, code, name')
      .eq('tenant_id', tenantId)
      .eq('code', parsed.data.roleCode)
      .maybeSingle()
    if (!role) {
      return { error: `Rol "${parsed.data.roleCode}" no existe en este tenant` }
    }

    // Get or invite the user
    const { id: userId, created } = await findOrInviteUser(
      parsed.data.email,
      parsed.data.fullName,
    )

    // Upsert profile (avoid duplicate row if profile already exists)
    if (created && parsed.data.fullName) {
      await admin.from('user_profiles').upsert({
        id: userId,
        full_name: parsed.data.fullName,
      })
    }

    // Ensure membership
    await admin
      .from('user_tenant_memberships')
      .upsert(
        { user_id: userId, tenant_id: tenantId, active: true },
        { onConflict: 'user_id,tenant_id' },
      )

    // Assign role (skip if already active)
    const { data: existing } = await admin
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('role_id', role.id)
      .is('revoked_at', null)
      .maybeSingle()

    if (!existing) {
      const { error: roleErr } = await admin.from('user_roles').insert({
        user_id: userId,
        tenant_id: tenantId,
        role_id: role.id,
        assigned_by: session.userId,
      })
      if (roleErr) {
        return { error: 'No se pudo asignar el rol' }
      }
    }

    await logActivity({
      tenantId,
      actorUserId: session.userId,
      actionCode: 'tenant.user_invited',
      resourceType: 'user',
      resourceId: userId,
      summary: `${parsed.data.email} invitado como ${role.code}`,
      metadata: { email: parsed.data.email, roleCode: role.code, created },
    })

    revalidatePath(`/a/tenants/${tenantId}/users`)
    return {
      success: true,
      message: created
        ? 'Usuario invitado por email'
        : 'Rol asignado al usuario existente',
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Error al invitar usuario',
    }
  }
}

export async function revokeTenantRoleAction(
  _prev: unknown,
  formData: FormData,
): Promise<TenantUserActionResult> {
  try {
    const tenantId = (formData.get('tenantId') as string | null)?.trim() ?? ''
    const session = await requireTenantAdmin(tenantId)

    const userRoleId = (formData.get('userRoleId') as string | null)?.trim() ?? ''
    if (!UUID_RE.test(userRoleId)) {
      return { error: 'userRoleId invalido' }
    }

    const admin = createAdminClient()

    // Verify the role belongs to this tenant (defense in depth)
    const { data: row } = await admin
      .from('user_roles')
      .select('id, tenant_id, user_id, role_id, roles!inner(code)')
      .eq('id', userRoleId)
      .maybeSingle()

    if (!row || row.tenant_id !== tenantId) {
      return { error: 'Asignacion no encontrada' }
    }

    const { error } = await admin
      .from('user_roles')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', userRoleId)

    if (error) return { error: 'No se pudo revocar el rol' }

    type RoleRow = { code: string } | { code: string }[]
    const rs = Array.isArray(row.roles) ? row.roles : [row.roles]
    const code = (rs[0] as { code: string } | undefined)?.code ?? 'unknown'
    void (row.roles as RoleRow)

    await logActivity({
      tenantId,
      actorUserId: session.userId,
      actionCode: 'tenant.role_revoked',
      resourceType: 'user_role',
      resourceId: userRoleId,
      summary: `Rol ${code} revocado`,
      metadata: { userRoleId, targetUserId: row.user_id },
    })

    revalidatePath(`/a/tenants/${tenantId}/users`)
    return { success: true, message: 'Rol revocado' }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Error al revocar rol',
    }
  }
}
