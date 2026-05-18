'use server'

import { z } from 'zod'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { logActivity } from '@/lib/audit/activity'
import { createTenantSchema } from '@/lib/validators/auth'
import { revalidateTenantResolution } from '@/lib/tenant/revalidate'

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

  // Derive subdomain from slug (subdomain is NOT NULL UNIQUE; defaults to a
  // valid DNS label generated from the slug).
  const subdomain = parsed.data.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63) || 'tenant'

  // Create tenant
  const { data: tenant, error } = await admin
    .from('tenants')
    .insert({ name: parsed.data.name, slug: parsed.data.slug, subdomain })
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SUBDOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

const updateTenantSchema = z.object({
  name: z.string().trim().min(1, 'Nombre requerido').max(120),
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Subdomain requerido')
    .max(63)
    .regex(SUBDOMAIN_RE, 'Subdomain invalido (solo a-z, 0-9, guion)'),
  active: z.boolean(),
})

export type UpdateTenantResult =
  | { success: true }
  | { error: string }

export async function updateTenantAction(
  _prev: unknown,
  formData: FormData,
): Promise<UpdateTenantResult> {
  const session = await requireSession()
  if (!session.isSuperAdmin) {
    return { error: 'Solo super_admin puede editar tenants' }
  }

  const tenantId = (formData.get('tenantId') as string | null)?.trim() ?? ''
  if (!UUID_RE.test(tenantId)) {
    return { error: 'tenantId invalido' }
  }

  const parsed = updateTenantSchema.safeParse({
    name: formData.get('name') ?? '',
    subdomain: formData.get('subdomain') ?? '',
    active: formData.get('active') === 'on' || formData.get('active') === 'true',
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()

  // Block subdomain collision
  const { data: collision } = await admin
    .from('tenants')
    .select('id')
    .eq('subdomain', parsed.data.subdomain)
    .neq('id', tenantId)
    .maybeSingle()
  if (collision) {
    return { error: 'Ese subdomain ya esta en uso' }
  }

  const { data: previous } = await admin
    .from('tenants')
    .select('name, subdomain, active')
    .eq('id', tenantId)
    .maybeSingle()

  const { error } = await admin
    .from('tenants')
    .update({
      name: parsed.data.name,
      subdomain: parsed.data.subdomain,
      active: parsed.data.active,
    })
    .eq('id', tenantId)

  if (error) {
    if (error.code === '23505') return { error: 'Ese subdomain ya esta en uso' }
    return { error: 'No se pudo actualizar el tenant' }
  }

  await logActivity({
    tenantId,
    actorUserId: session.userId,
    actionCode: 'tenant.updated',
    resourceType: 'tenant',
    resourceId: tenantId,
    summary: `Tenant actualizado: ${parsed.data.name}`,
    metadata: {
      prev_name: previous?.name ?? null,
      prev_subdomain: previous?.subdomain ?? null,
      prev_active: previous?.active ?? null,
      next_name: parsed.data.name,
      next_subdomain: parsed.data.subdomain,
      next_active: parsed.data.active,
    },
  })

  revalidatePath(`/a/tenants/${tenantId}`)
  revalidatePath('/a/tenants')
  if (previous?.subdomain) revalidateTenantResolution(previous.subdomain)
  revalidateTenantResolution(parsed.data.subdomain)

  return { success: true }
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
