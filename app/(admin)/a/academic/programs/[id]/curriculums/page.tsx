import Link from 'next/link'
import { notFound } from 'next/navigation'

import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { getProgramById } from '@/lib/db/academic'
import { getCurriculums } from '@/lib/db/curriculums'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function statusBadgeClass(status: string) {
  switch (status) {
    case 'published':
      return 'bg-primary/10 text-primary'
    case 'archived':
      return 'bg-destructive/10 text-destructive'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'published':
      return 'Publicado'
    case 'archived':
      return 'Archivado'
    default:
      return 'Borrador'
  }
}

export default async function ProgramCurriculumsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await requireSession()
  await requirePermission('curriculums:read')

  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }

  const tenantId = session.activeTenantId
  const program = await getProgramById(tenantId, id).catch(() => null)
  if (!program) notFound()

  const curriculums = await getCurriculums(tenantId, id)
  const canWrite = session.permissions.has('curriculums:write')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pensums del programa</h2>
        {canWrite && (
          <Button asChild>
            <Link href="/a/academic/curriculums/new">Nuevo pensum</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-3">
        {curriculums.map((c) => (
          <Card key={c.id} className="glass-subtle">
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <Link href={`/a/academic/curriculums/${c.id}`} className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{c.name}</p>
                  <span className="text-xs text-muted-foreground">v{c.version}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(
                      c.status,
                    )}`}
                  >
                    {statusLabel(c.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {c.cycles} ciclos · {c.subject_count} materias
                </p>
                {c.notes && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{c.notes}</p>
                )}
              </Link>
              <Button asChild variant="outline" size="sm">
                <Link href={`/a/academic/curriculums/${c.id}`}>Abrir</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        {curriculums.length === 0 && (
          <p className="text-muted-foreground">No hay pensums para este programa.</p>
        )}
      </div>
    </div>
  )
}
