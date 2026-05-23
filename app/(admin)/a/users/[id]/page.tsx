import { notFound } from 'next/navigation'

import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { getUserProfile } from '@/lib/db/users'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type UserGeneralPageProps = {
  params: Promise<{ id: string }>
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const dateFmt = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' })

export default async function UserGeneralPage({ params }: UserGeneralPageProps) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const session = await requireSession()
  await requirePermission('users:read')
  if (!session.activeTenantId) notFound()

  const profile = await getUserProfile(session.activeTenantId, id)
  if (!profile) notFound()

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card className="glass-subtle">
          <CardHeader>
            <CardTitle className="text-base">Perfil</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label="Nombre completo" value={profile.full_name || '—'} />
              <Field
                label="Tipo de documento"
                value={profile.document_type || '—'}
              />
              <Field
                label="Número de documento"
                value={profile.document_number || '—'}
              />
              <Field label="Teléfono" value={profile.phone || '—'} />
              <Field
                label="Creado"
                value={dateFmt.format(new Date(profile.created_at))}
              />
              <Field
                label="Miembro desde"
                value={dateFmt.format(new Date(profile.joined_at))}
              />
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="glass-subtle">
          <CardHeader>
            <CardTitle className="text-base">Roles en este tenant</CardTitle>
          </CardHeader>
          <CardContent>
            {profile.roles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin roles asignados.</p>
            ) : (
              <ul className="space-y-1.5">
                {profile.roles.map((role) => (
                  <li
                    key={role}
                    className="rounded-md border bg-card/50 px-3 py-2 text-sm"
                  >
                    {role}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  )
}
