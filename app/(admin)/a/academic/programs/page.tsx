import Link from 'next/link'
import type { Route } from 'next'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { getPrograms } from '@/lib/db/academic'
import { getTenantTerms } from '@/lib/terminology/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProgramRowActions } from './row-actions'

export default async function ProgramsPage() {
  const session = await requireSession()
  await requirePermission('academic:read')

  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }

  const [programs, terms] = await Promise.all([
    getPrograms(session.activeTenantId),
    getTenantTerms(session.activeTenantId),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{terms.program.plural} Académicos</h1>
        {session.permissions.has('academic:write') && (
          <Button asChild>
            <a href="/a/academic/programs/new">Nuevo {terms.program.singular.toLowerCase()}</a>
          </Button>
        )}
      </div>

      <div className="grid gap-3">
        {programs.map((program) => (
          <Card key={program.id} className="glass-subtle">
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <Link href={`/a/academic/programs/${program.id}` as Route} className="min-w-0 flex-1">
                <p className="font-medium">{program.name}</p>
                <p className="text-sm text-muted-foreground">
                  {program.code} · {program.modality} · {program.duration_periods} periodos
                </p>
                {program.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{program.description}</p>
                )}
              </Link>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/a/academic/programs/${program.id}` as Route}>Abrir</Link>
                </Button>
                <ProgramRowActions
                  programId={program.id}
                  canWrite={session.permissions.has('academic:write')}
                />
              </div>
            </CardContent>
          </Card>
        ))}
        {programs.length === 0 && (
          <p className="text-muted-foreground">
            No hay {terms.program.plural.toLowerCase()} registrados.
          </p>
        )}
      </div>
    </div>
  )
}
