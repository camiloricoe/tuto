import { notFound } from 'next/navigation'
import Link from 'next/link'

import { requireSession } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

type TenantCockpitLayoutProps = {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function authorize(tenantId: string) {
  const session = await requireSession()
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
    notFound()
  }
  return session
}

export default async function TenantCockpitLayout({
  children,
  params,
}: TenantCockpitLayoutProps) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  await authorize(id)

  const admin = createAdminClient()
  const { data: tenant } = await admin
    .from('tenants')
    .select('id, name, subdomain, custom_domain, active')
    .eq('id', id)
    .maybeSingle()

  if (!tenant) notFound()

  const tabs = [
    { href: `/a/tenants/${id}`, label: 'General' },
    { href: `/a/tenants/${id}/branding`, label: 'Branding' },
    { href: `/a/tenants/${id}/domains`, label: 'Dominios' },
    { href: `/a/tenants/${id}/users`, label: 'Usuarios' },
  ] as const

  return (
    <div className="space-y-6">
      <header className="space-y-2 border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/a/tenants"
              className="text-xs text-muted-foreground hover:underline"
            >
              ← Todos los tenants
            </Link>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {tenant.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {tenant.subdomain}.creadigitalagency.com
              </code>
              {tenant.custom_domain && (
                <>
                  {' · '}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {tenant.custom_domain}
                  </code>
                </>
              )}
              {!tenant.active && (
                <span className="ml-2 rounded bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                  inactivo
                </span>
              )}
            </p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto" aria-label="Tenant sections">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="rounded-md border border-transparent px-3 py-1.5 text-sm text-muted-foreground transition hover:border-border hover:bg-muted hover:text-foreground"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>

      <div>{children}</div>
    </div>
  )
}
