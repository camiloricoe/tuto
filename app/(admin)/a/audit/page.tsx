import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormattedTime } from '@/components/shared/formatted-time'

type SearchParams = Promise<{
  resource?: string
  q?: string
  days?: string
  source?: 'activity' | 'auth'
}>

const RESOURCE_OPTIONS = [
  'tenant',
  'user',
  'role',
  'program',
  'subject',
  'period',
  'course',
  'enrollment',
  'grade',
  'concept',
  'charge',
  'payment',
  'import',
] as const

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession()
  await requirePermission('audit:read')

  const params = await searchParams
  const resource = params.resource ?? ''
  const q = params.q ?? ''
  const days = parseInt(params.days ?? '7', 10)
  const source = params.source ?? 'activity'

  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }

  const admin = createAdminClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const activityQuery = admin
    .from('activity_log')
    .select('id, action_code, resource_type, resource_id, summary, metadata, occurred_at, actor_user_id, tenant_id')
    .gte('occurred_at', since)
    .order('occurred_at', { ascending: false })
    .limit(200)

  if (!session.isSuperAdmin) {
    activityQuery.eq('tenant_id', session.activeTenantId)
  }
  if (resource) activityQuery.eq('resource_type', resource)
  if (q) activityQuery.ilike('summary', `%${q}%`)

  const authQuery = admin
    .from('auth_events')
    .select('id, event, ip_address, user_agent, metadata, occurred_at, user_id')
    .gte('occurred_at', since)
    .order('occurred_at', { ascending: false })
    .limit(200)

  const [activityRes, authRes, tenantsRes] = await Promise.all([
    source === 'activity' ? activityQuery : Promise.resolve({ data: [] as never[] }),
    source === 'auth' ? authQuery : Promise.resolve({ data: [] as never[] }),
    session.isSuperAdmin
      ? admin.from('tenants').select('id, name').eq('active', true)
      : Promise.resolve({ data: [] as never[] }),
  ])

  const activity = activityRes.data ?? []
  const authEvents = authRes.data ?? []
  const tenantNameById = new Map((tenantsRes.data ?? []).map((t: { id: string; name: string }) => [t.id, t.name]))

  const userIds = Array.from(
    new Set([
      ...activity.map((a) => a.actor_user_id),
      ...authEvents.map((a) => a.user_id),
    ].filter((id): id is string => typeof id === 'string')),
  )
  const { data: profiles } = userIds.length > 0
    ? await admin.from('user_profiles').select('id, full_name').in('id', userIds)
    : { data: [] }
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Auditoria</h1>
        {session.isSuperAdmin && (
          <span className="text-xs text-muted-foreground">Vista global (todos los tenants)</span>
        )}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Fuente</label>
          <select name="source" defaultValue={source} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="activity">Actividad de negocio</option>
            <option value="auth">Eventos de auth</option>
          </select>
        </div>
        {source === 'activity' && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Recurso</label>
            <select name="resource" defaultValue={resource} className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="">Todos</option>
              {RESOURCE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Ultimos</label>
          <select name="days" defaultValue={String(days)} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="1">1 dia</option>
            <option value="7">7 dias</option>
            <option value="30">30 dias</option>
            <option value="90">90 dias</option>
          </select>
        </div>
        {source === 'activity' && (
          <div className="flex flex-1 flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground">Buscar en resumen</label>
            <input
              name="q"
              defaultValue={q}
              placeholder="ej: Publico notas"
              className="h-9 rounded-md border bg-background px-3 text-sm"
            />
          </div>
        )}
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Filtrar
        </button>
      </form>

      {source === 'activity' ? (
        <Card className="glass-subtle">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Actividad ({activity.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin eventos en este rango.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-3">Fecha</th>
                      {session.isSuperAdmin && <th className="py-2 pr-3">Tenant</th>}
                      <th className="py-2 pr-3">Usuario</th>
                      <th className="py-2 pr-3">Accion</th>
                      <th className="py-2 pr-3">Recurso</th>
                      <th className="py-2 pr-3">Resumen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {activity.map((entry) => {
                      const profile = profileById.get(entry.actor_user_id)
                      return (
                        <tr key={entry.id} className="align-top">
                          <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted-foreground">
                            <FormattedTime value={entry.occurred_at} />
                          </td>
                          {session.isSuperAdmin && (
                            <td className="py-2 pr-3 text-xs">
                              {tenantNameById.get(entry.tenant_id) ?? entry.tenant_id.slice(0, 8)}
                            </td>
                          )}
                          <td className="py-2 pr-3">{profile?.full_name ?? entry.actor_user_id.slice(0, 8)}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{entry.action_code}</td>
                          <td className="py-2 pr-3 text-xs">
                            {entry.resource_type}
                            {entry.resource_id ? ` · ${entry.resource_id.slice(0, 8)}` : ''}
                          </td>
                          <td className="py-2 pr-3">{entry.summary}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-subtle">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Eventos de Auth ({authEvents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {authEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin eventos en este rango.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-3">Fecha</th>
                      <th className="py-2 pr-3">Usuario</th>
                      <th className="py-2 pr-3">Evento</th>
                      <th className="py-2 pr-3">IP</th>
                      <th className="py-2 pr-3">User Agent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {authEvents.map((entry) => {
                      const profile = entry.user_id ? profileById.get(entry.user_id) : null
                      return (
                        <tr key={entry.id}>
                          <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted-foreground">
                            <FormattedTime value={entry.occurred_at} />
                          </td>
                          <td className="py-2 pr-3">
                            {profile?.full_name ?? (entry.user_id ? entry.user_id.slice(0, 8) : '—')}
                          </td>
                          <td className="py-2 pr-3 font-mono text-xs">{entry.event}</td>
                          <td className="py-2 pr-3 text-xs text-muted-foreground">{entry.ip_address ? String(entry.ip_address) : '—'}</td>
                          <td className="py-2 pr-3 text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                            {entry.user_agent ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
