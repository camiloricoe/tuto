import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Route } from 'next'

import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { getUserProfile } from '@/lib/db/users'

type UserCockpitLayoutProps = {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const dateFmt = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' })

export default async function UserCockpitLayout({
  children,
  params,
}: UserCockpitLayoutProps) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const session = await requireSession()
  await requirePermission('users:read')

  if (!session.activeTenantId) notFound()

  const profile = await getUserProfile(session.activeTenantId, id)
  if (!profile) notFound()

  const tabs: Array<{ href: Route; label: string }> = [
    { href: `/a/users/${id}` as Route, label: 'General' },
    { href: `/a/users/${id}/academic` as Route, label: 'Académico' },
    { href: `/a/users/${id}/financial` as Route, label: 'Financiero' },
  ]

  const documentLine =
    profile.document_type && profile.document_number
      ? `${profile.document_type} ${profile.document_number}`
      : profile.document_number || null

  return (
    <div className="space-y-6">
      <header className="space-y-3 border-b pb-4">
        <div>
          <Link
            href="/a/users"
            className="text-xs text-muted-foreground hover:underline"
          >
            ← Todos los usuarios
          </Link>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {profile.full_name || 'Sin nombre'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {documentLine && (
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {documentLine}
              </code>
            )}
            <span className={documentLine ? 'ml-2' : ''}>
              Miembro desde {dateFmt.format(new Date(profile.joined_at))}
            </span>
          </p>
          {profile.roles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile.roles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {role}
                </span>
              ))}
            </div>
          )}
        </div>

        <nav className="flex gap-1 overflow-x-auto" aria-label="User sections">
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
