import Link from 'next/link'
import { Camera } from 'lucide-react'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { getGroups } from '@/lib/db/groups'
import { getTenantTerms } from '@/lib/terminology/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GroupRowActions } from './row-actions'

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  graduated: 'Graduado',
  archived: 'Archivado',
}

const STATUS_CLASSES: Record<string, string> = {
  active: 'bg-primary/10 text-primary',
  graduated: 'bg-secondary text-secondary-foreground',
  archived: 'bg-muted text-muted-foreground',
}

export default async function GroupsPage() {
  const session = await requireSession()
  await requirePermission('groups:read')

  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }

  const [groups, terms] = await Promise.all([
    getGroups(session.activeTenantId),
    getTenantTerms(session.activeTenantId),
  ])
  const canWrite = session.permissions.has('groups:write')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{terms.group.plural}</h1>
        {canWrite && (
          <Button asChild>
            <Link href="/a/academic/groups/new">
              Nuevo {terms.group.singular.toLowerCase()}
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-3">
        {groups.map((group) => {
          const program = group.academic_programs as unknown as
            | { name?: string; code?: string }
            | null
          const statusLabel = STATUS_LABELS[group.status] ?? group.status
          const statusClass = STATUS_CLASSES[group.status] ?? 'bg-muted text-muted-foreground'
          return (
            <Card key={group.id} className="glass-subtle">
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <Link href={`/a/academic/groups/${group.id}`} className="min-w-0 flex-1">
                  <p className="font-medium">{group.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {program?.name ?? 'Sin programa'}
                    {group.code ? ` · ${group.code}` : ''}
                    {` · Ingreso ${group.intake_year}`}
                    {group.intake_period ? `-${group.intake_period}` : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 ${statusClass}`}>
                      {statusLabel}
                    </span>
                    <span className="text-muted-foreground">
                      Ciclo actual: {group.current_cycle}
                    </span>
                    <span className="text-muted-foreground">
                      {group.member_count} miembro{group.member_count === 1 ? '' : 's'}
                    </span>
                    {group.snapshotted_at && (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Camera className="h-3 w-3" /> {terms.curriculum.singular} aplicado
                      </span>
                    )}
                  </div>
                </Link>
                <GroupRowActions groupId={group.id} canWrite={canWrite} />
              </CardContent>
            </Card>
          )
        })}
        {groups.length === 0 && (
          <p className="text-muted-foreground">
            No hay {terms.group.plural.toLowerCase()} registrados.
          </p>
        )}
      </div>
    </div>
  )
}
