import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function UsersPage() {
  const session = await requireSession()
  await requirePermission('users:read')

  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }

  const admin = createAdminClient()

  const { data: memberships } = await admin
    .from('user_tenant_memberships')
    .select('user_id')
    .eq('tenant_id', session.activeTenantId)
    .eq('active', true)

  const userIds = (memberships ?? []).map((m) => m.user_id)

  const { data: profiles } = userIds.length > 0
    ? await admin.from('user_profiles').select('id, full_name').in('id', userIds)
    : { data: [] }

  const { data: userRoles } = userIds.length > 0
    ? await admin
        .from('user_roles')
        .select('user_id, roles(code, name)')
        .eq('tenant_id', session.activeTenantId)
        .is('revoked_at', null)
        .in('user_id', userIds)
    : { data: [] }

  const rolesByUser = new Map<string, string[]>()
  for (const ur of userRoles ?? []) {
    const code = (ur.roles as unknown as { code: string })?.code
    if (code) {
      const existing = rolesByUser.get(ur.user_id) ?? []
      existing.push(code)
      rolesByUser.set(ur.user_id, existing)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        {session.permissions.has('users:invite') && (
          <Button asChild>
            <a href="/a/users/new">Invitar usuario</a>
          </Button>
        )}
      </div>
      <div className="grid gap-3">
        {(profiles ?? []).map((profile) => (
          <Card key={profile.id} className="glass-subtle">
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">{profile.full_name || 'Sin nombre'}</p>
                <p className="text-sm text-muted-foreground">
                  {(rolesByUser.get(profile.id) ?? []).join(', ') || 'Sin rol'}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
        {(profiles ?? []).length === 0 && (
          <p className="text-muted-foreground">No hay usuarios en este tenant.</p>
        )}
      </div>
    </div>
  )
}
