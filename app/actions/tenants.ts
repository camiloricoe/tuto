'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { logActivity } from '@/lib/audit/activity'
import { createTenantSchema } from '@/lib/validators/auth'

export async function createTenantAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('tenants:write')

  const parsed = createTenantSchema.safeParse({
    name: formData.get('name') as string,
    slug: formData.get('slug') as string,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()

  // Create tenant
  const { data: tenant, error } = await admin
    .from('tenants')
    .insert({ name: parsed.data.name, slug: parsed.data.slug })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { error: 'El slug ya existe' }
    return { error: 'Error al crear tenant' }
  }

  // Seed default roles for this tenant
  await admin.rpc('seed_default_roles_for_tenant', { p_tenant_id: tenant.id })

  // Add creator as member
  await admin.from('user_tenant_memberships').insert({
    user_id: session.userId,
    tenant_id: tenant.id,
  })

  // Assign super_admin role in this tenant
  const { data: saRole } = await admin
    .from('roles')
    .select('id')
    .eq('tenant_id', tenant.id)
    .eq('code', 'super_admin')
    .single()

  if (saRole) {
    await admin.from('user_roles').insert({
      user_id: session.userId,
      tenant_id: tenant.id,
      role_id: saRole.id,
      assigned_by: session.userId,
    })
  }

  await logActivity({
    tenantId: tenant.id,
    actorUserId: session.userId,
    actionCode: 'tenant.created',
    resourceType: 'tenant',
    resourceId: tenant.id,
    summary: `Tenant "${tenant.name}" creado`,
  })

  return { success: true, tenantId: tenant.id }
}

export async function switchActiveTenantAction(tenantId: string) {
  const session = await requireSession()

  // Verify user belongs to this tenant
  if (!session.tenants.some((t) => t.id === tenantId)) {
    return { error: 'No tienes acceso a este tenant' }
  }

  const cookieStore = await cookies()
  cookieStore.set('tuto-active-tenant', tenantId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })

  redirect('/')
}
