import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'

import { InviteForm } from './invite-form'
import { RevokeButton } from './revoke-button'

export const metadata = {
  title: 'Usuarios',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  coordinator: 'Coordinador',
  treasurer: 'Tesorero',
  teacher: 'Docente',
  student: 'Estudiante',
  super_admin: 'Super admin',
}

const ROLE_BADGE_CLASS: Record<string, string> = {
  admin: 'bg-primary/10 text-primary border-primary/20',
  coordinator: 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300',
  treasurer: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300',
  teacher: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300',
  student: 'bg-muted text-foreground border-border',
  super_admin: 'bg-destructive/10 text-destructive border-destructive/20',
}

function formatDate(value: string | null) {
  if (!value) return null
  try {
    return new Date(value).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return null
  }
}

type RolesShape = { code: string; name: string } | { code: string; name: string }[] | null

function extractRole(roles: RolesShape): { code: string; name: string } | null {
  if (!roles) return null
  if (Array.isArray(roles)) return roles[0] ?? null
  return roles
}

export default async function TenantUsersPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // Layout already enforces UUID validity + tenant existence + super_admin OR
  // admin-of-tenant access. If we render, the caller is authorized.
  const { id: tenantId } = await params

  const admin = createAdminClient()

  const { data: memberships } = await admin
    .from('user_tenant_memberships')
    .select('user_id, joined_at')
    .eq('tenant_id', tenantId)
    .eq('active', true)

  const userIds = (memberships ?? []).map((m) => m.user_id)

  const joinedByUser = new Map<string, string | null>()
  for (const m of memberships ?? []) {
    joinedByUser.set(m.user_id, m.joined_at ?? null)
  }

  const { data: profiles } =
    userIds.length > 0
      ? await admin
          .from('user_profiles')
          .select('id, full_name')
          .in('id', userIds)
      : { data: [] as { id: string; full_name: string | null }[] }

  const profileById = new Map<string, { full_name: string | null }>()
  for (const p of profiles ?? []) {
    profileById.set(p.id, { full_name: p.full_name })
  }

  const { data: userRoles } =
    userIds.length > 0
      ? await admin
          .from('user_roles')
          .select('id, user_id, assigned_at, roles(code, name)')
          .eq('tenant_id', tenantId)
          .is('revoked_at', null)
          .in('user_id', userIds)
      : { data: [] as Array<{
          id: string
          user_id: string
          assigned_at: string | null
          roles: RolesShape
        }> }

  type UserRoleEntry = {
    userRoleId: string
    code: string
    name: string
  }
  const rolesByUser = new Map<string, UserRoleEntry[]>()
  for (const ur of userRoles ?? []) {
    const role = extractRole(ur.roles as RolesShape)
    if (!role) continue
    const list = rolesByUser.get(ur.user_id) ?? []
    list.push({ userRoleId: ur.id, code: role.code, name: role.name })
    rolesByUser.set(ur.user_id, list)
  }

  // Resolve emails via auth admin (paginated; matches invite action approach)
  const { data: authList } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  const emailById = new Map<string, string | null>()
  for (const u of authList?.users ?? []) {
    emailById.set(u.id, u.email ?? null)
  }

  // Build display list — include users who have a membership, sort by name then email.
  const rows = userIds
    .map((userId) => {
      const profile = profileById.get(userId)
      const email = emailById.get(userId) ?? null
      const roles = rolesByUser.get(userId) ?? []
      const joined = joinedByUser.get(userId) ?? null
      return {
        userId,
        fullName: profile?.full_name ?? null,
        email,
        roles,
        joined,
      }
    })
    .sort((a, b) => {
      const an = (a.fullName || a.email || '').toLowerCase()
      const bn = (b.fullName || b.email || '').toLowerCase()
      return an.localeCompare(bn)
    })

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Usuarios</h2>
        <p className="text-sm text-muted-foreground">
          Invita usuarios a esta institucion y administra sus roles. Las invitaciones
          se envian por email.
        </p>
      </header>

      <InviteForm tenantId={tenantId} />

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Miembros activos ({rows.length})
        </h3>

        {rows.length === 0 ? (
          <Card className="glass-subtle">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Aun no hay usuarios en esta institucion.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {rows.map((row) => (
              <Card key={row.userId} className="glass-subtle">
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">
                      {row.fullName || row.email || 'Usuario sin nombre'}
                      {row.fullName && row.email && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          ({row.email})
                        </span>
                      )}
                    </p>
                    {row.joined && (
                      <p className="text-xs text-muted-foreground">
                        Se unio el {formatDate(row.joined)}
                      </p>
                    )}
                    {row.roles.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Sin roles activos en este tenant.
                      </p>
                    )}
                  </div>

                  {row.roles.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {row.roles.map((r) => (
                        <div
                          key={r.userRoleId}
                          className="flex items-center gap-1.5"
                        >
                          <span
                            className={
                              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ' +
                              (ROLE_BADGE_CLASS[r.code] ??
                                'bg-muted text-foreground border-border')
                            }
                          >
                            {ROLE_LABELS[r.code] ?? r.name ?? r.code}
                          </span>
                          <RevokeButton
                            tenantId={tenantId}
                            userRoleId={r.userRoleId}
                            roleLabel={ROLE_LABELS[r.code] ?? r.code}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
