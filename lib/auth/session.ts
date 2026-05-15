import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { UnauthorizedError } from './errors'

export type Session = {
  userId: string
  email: string
  isSuperAdmin: boolean
  profile: {
    fullName: string
    avatarUrl: string | null
    twoFactorRequired: boolean
    twoFactorEnabledAt: string | null
  }
  activeTenantId: string | null
  tenants: Array<{ id: string; name: string; slug: string }>
  roles: string[]
  permissions: Set<string>
}

export const ACTIVE_TENANT_COOKIE = 'tuto-active-tenant'

export async function getSession(): Promise<Session | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('full_name, avatar_url, two_factor_required, two_factor_enabled_at, is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const isSuperAdmin = profile.is_super_admin === true

  let tenants: Array<{ id: string; name: string; slug: string }>

  if (isSuperAdmin) {
    const { data: allTenants } = await admin
      .from('tenants')
      .select('id, name, slug')
      .eq('active', true)
      .order('name')
    tenants = allTenants ?? []
  } else {
    const { data: memberships } = await admin
      .from('user_tenant_memberships')
      .select('tenants(id, name, slug)')
      .eq('user_id', user.id)
      .eq('active', true)
    tenants = (memberships ?? [])
      .map((m) => m.tenants as unknown as { id: string; name: string; slug: string })
      .filter(Boolean)
  }

  const cookieStore = await cookies()
  let activeTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? null

  if (!activeTenantId || !tenants.some((t) => t.id === activeTenantId)) {
    activeTenantId = tenants[0]?.id ?? null
  }

  let roles: string[] = []
  const permissions = new Set<string>()

  if (isSuperAdmin) {
    roles = ['super_admin']
    const { data: allPerms } = await admin.from('permissions').select('code')
    for (const p of allPerms ?? []) permissions.add(p.code)
  } else if (activeTenantId) {
    const { data: userRoles } = await admin
      .from('user_roles')
      .select('role_id, roles(code)')
      .eq('user_id', user.id)
      .eq('tenant_id', activeTenantId)
      .is('revoked_at', null)

    roles = (userRoles ?? []).map((ur) => (ur.roles as unknown as { code: string })?.code).filter(Boolean)

    const roleIds = (userRoles ?? []).map((ur) => ur.role_id)
    if (roleIds.length > 0) {
      const { data: rolePerms } = await admin
        .from('role_permissions')
        .select('permissions(code)')
        .in('role_id', roleIds)

      for (const rp of rolePerms ?? []) {
        const perm = rp.permissions as unknown as { code: string }
        if (perm?.code) permissions.add(perm.code)
      }
    }
  }

  return {
    userId: user.id,
    email: user.email ?? '',
    isSuperAdmin,
    profile: {
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      twoFactorRequired: profile.two_factor_required,
      twoFactorEnabledAt: profile.two_factor_enabled_at,
    },
    activeTenantId,
    tenants,
    roles,
    permissions,
  }
}

export async function requireSession(): Promise<Session> {
  const session = await getSession()
  if (!session) throw new UnauthorizedError()
  return session
}

export function getPortalForRoles(roles: string[]): '/a' | '/t' | '/s' {
  const adminRoles = ['super_admin', 'admin', 'coordinator', 'treasurer']
  if (roles.some((r) => adminRoles.includes(r))) return '/a'
  if (roles.includes('teacher')) return '/t'
  return '/s'
}
