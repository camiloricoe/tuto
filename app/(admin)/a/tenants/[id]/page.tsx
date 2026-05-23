import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Route } from 'next'
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Globe,
  Palette,
  Users,
} from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantTerms } from '@/lib/terminology/server'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { FormattedTime } from '@/components/shared/formatted-time'

import { GeneralEditForm } from './general-edit-form'

type TenantGeneralPageProps = {
  params: Promise<{ id: string }>
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function TenantGeneralPage({
  params,
}: TenantGeneralPageProps) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const admin = createAdminClient()

  const { data: tenant } = await admin
    .from('tenants')
    .select(
      'id, name, slug, subdomain, custom_domain, active, created_at, updated_at',
    )
    .eq('id', id)
    .maybeSingle()

  if (!tenant) notFound()

  // Cheap counts via head + exact count
  const [membersRes, programsRes, coursesRes, terms] = await Promise.all([
    admin
      .from('user_tenant_memberships')
      .select('user_id', { count: 'exact', head: true })
      .eq('tenant_id', id)
      .eq('active', true),
    admin
      .from('academic_programs')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', id)
      .is('deleted_at', null),
    admin
      .from('courses')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', id)
      .is('deleted_at', null),
    getTenantTerms(id),
  ])

  const memberCount = membersRes.count ?? 0
  const programCount = programsRes.count ?? 0
  const courseCount = coursesRes.count ?? 0

  const quickLinks: Array<{
    href: Route
    label: string
    description: string
    icon: typeof Palette
  }> = [
    {
      href: `/a/tenants/${id}/branding` as Route,
      label: 'Editar branding',
      description: 'Logo, colores y favicon del tenant',
      icon: Palette,
    },
    {
      href: `/a/tenants/${id}/domains` as Route,
      label: 'Configurar dominio propio',
      description: 'Apunta un dominio personalizado',
      icon: Globe,
    },
    {
      href: `/a/tenants/${id}/users` as Route,
      label: 'Administrar usuarios',
      description: 'Miembros, roles y permisos',
      icon: Users,
    },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* ─── Left column — summary + edit form ─── */}
      <div className="space-y-6 lg:col-span-2">
        {/* Summary card */}
        <Card className="glass-subtle">
          <CardHeader>
            <CardTitle className="text-base">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  ID
                </dt>
                <dd>
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                    {tenant.id}
                  </code>
                </dd>
              </div>

              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Slug{' '}
                  <span className="text-[10px] font-normal normal-case text-muted-foreground/70">
                    (interno, no editable)
                  </span>
                </dt>
                <dd>
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                    {tenant.slug}
                  </code>
                </dd>
              </div>

              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Subdominio
                </dt>
                <dd>
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                    {tenant.subdomain}.creadigitalagency.com
                  </code>
                </dd>
              </div>

              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Dominio personalizado
                </dt>
                <dd>
                  {tenant.custom_domain ? (
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                      {tenant.custom_domain}
                    </code>
                  ) : (
                    <span className="text-muted-foreground">
                      Sin dominio personalizado
                    </span>
                  )}
                </dd>
              </div>

              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Estado
                </dt>
                <dd>
                  {tenant.active ? (
                    <span className="inline-flex items-center rounded bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                      Inactivo
                    </span>
                  )}
                </dd>
              </div>

              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Creado
                </dt>
                <dd className="flex flex-wrap items-baseline gap-x-2">
                  <FormattedTime value={tenant.created_at} variant="relative" />
                  <span className="text-xs text-muted-foreground">
                    (<FormattedTime value={tenant.created_at} variant="datetime" />)
                  </span>
                </dd>
              </div>
            </dl>

            {/* Counts */}
            <div className="grid grid-cols-3 gap-3 border-t pt-4">
              <CountStat
                icon={<Users className="h-4 w-4" />}
                label="Miembros"
                value={memberCount}
              />
              <CountStat
                icon={<GraduationCap className="h-4 w-4" />}
                label="Programas"
                value={programCount}
              />
              <CountStat
                icon={<BookOpen className="h-4 w-4" />}
                label={terms.course.plural}
                value={courseCount}
              />
            </div>
          </CardContent>
        </Card>

        {/* Edit form */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Informacion general</CardTitle>
          </CardHeader>
          <CardContent>
            <GeneralEditForm
              initial={{
                tenantId: tenant.id,
                name: tenant.name,
                subdomain: tenant.subdomain,
                active: tenant.active,
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* ─── Right column — quick links ─── */}
      <div className="space-y-6">
        <Card className="glass-subtle">
          <CardHeader>
            <CardTitle className="text-base">Acciones rapidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center justify-between gap-3 rounded-md border bg-card/50 px-3 py-3 text-sm transition hover:border-foreground/20 hover:bg-accent"
                >
                  <span className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="space-y-0.5">
                      <span className="block font-medium leading-none">
                        {link.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {link.description}
                      </span>
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                </Link>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function CountStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
