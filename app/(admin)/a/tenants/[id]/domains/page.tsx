import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireSession } from '@/lib/auth/session'
import { requireSuperAdmin } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft } from 'lucide-react'
import { DomainsForm } from './form'

type Props = {
  params: Promise<{ id: string }>
}

export default async function TenantDomainsPage({ params }: Props) {
  await requireSession()
  await requireSuperAdmin()

  const { id } = await params
  const admin = createAdminClient()
  const { data: tenant, error } = await admin
    .from('tenants')
    .select('id, name, slug, subdomain, custom_domain, active')
    .eq('id', id)
    .single()

  if (error || !tenant) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/a/tenants"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a instituciones
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Dominios — {tenant.name}</h1>
        <p className="text-sm text-muted-foreground">
          Configura el dominio personalizado para que esta institucion pueda usar
          su propia URL (ej: <code>portal.miinstituto.edu.co</code>).
        </p>
      </div>

      <DomainsForm
        tenantId={tenant.id}
        tenantName={tenant.name}
        subdomain={tenant.subdomain ?? tenant.slug}
        initialCustomDomain={tenant.custom_domain}
      />
    </div>
  )
}
