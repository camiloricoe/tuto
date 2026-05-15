import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import { FormattedTime } from '@/components/shared/formatted-time'
import { Search, Building2 } from 'lucide-react'
import { CreateTenantForm } from './create-form'

type SearchParams = Promise<{ q?: string }>

export default async function TenantsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireSession()
  await requirePermission('tenants:read')

  const params = await searchParams
  const q = params.q ?? ''

  const admin = createAdminClient()
  let query = admin
    .from('tenants')
    .select('id, name, slug, active, created_at')
    .order('name')

  if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`)

  const { data: tenants } = await query

  const tenantIds = (tenants ?? []).map((t) => t.id)
  const { data: members } = tenantIds.length > 0
    ? await admin
        .from('user_tenant_memberships')
        .select('tenant_id')
        .in('tenant_id', tenantIds)
        .eq('active', true)
    : { data: [] }

  const memberCount = new Map<string, number>()
  for (const m of members ?? []) {
    memberCount.set(m.tenant_id, (memberCount.get(m.tenant_id) ?? 0) + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Instituciones</h1>
        <CreateTenantForm />
      </div>

      <form method="get" className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre o slug..."
          className="h-10 w-full rounded-lg border bg-background pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </form>

      <div className="grid gap-3">
        {(tenants ?? []).length === 0 ? (
          <p className="text-muted-foreground">
            {q ? `No hay instituciones que coincidan con "${q}".` : 'No hay instituciones aun.'}
          </p>
        ) : (
          (tenants ?? []).map((tenant) => (
            <Card key={tenant.id} className="glass-subtle">
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tenant.slug}
                      {!tenant.active && ' · inactivo'}
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{memberCount.get(tenant.id) ?? 0} miembros</p>
                  <p>
                    Creado <FormattedTime value={tenant.created_at} variant="date" />
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
