import Link from 'next/link'
import type { Route } from 'next'
import { Pencil } from 'lucide-react'
import { notFound } from 'next/navigation'

import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { getProgramById } from '@/lib/db/academic'
import { getCurriculums } from '@/lib/db/curriculums'
import { getGroups } from '@/lib/db/groups'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const MODALITY_LABELS: Record<string, string> = {
  presential: 'Presencial',
  virtual: 'Virtual',
  hybrid: 'Hibrido',
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return value
  }
}

export default async function ProgramGeneralPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await requireSession()
  await requirePermission('academic:read')

  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }

  const tenantId = session.activeTenantId
  const program = await getProgramById(tenantId, id).catch(() => null)
  if (!program) notFound()

  const [curriculums, groups, coursesCountRes] = await Promise.all([
    getCurriculums(tenantId, id),
    getGroups(tenantId, id),
    (async () => {
      const admin = createAdminClient()
      const { data: subjects } = await admin
        .from('subjects')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('program_id', id)
        .is('deleted_at', null)
      const subjectIds = (subjects ?? []).map((s) => s.id)
      if (subjectIds.length === 0) return 0
      const { count } = await admin
        .from('courses')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('subject_id', subjectIds)
        .is('deleted_at', null)
      return count ?? 0
    })(),
  ])

  const activeGroups = groups.filter((g) => g.status === 'active').length
  const canWrite = session.permissions.has('academic:write')
  const modalityLabel = MODALITY_LABELS[program.modality] ?? program.modality

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Resumen del programa</h2>
        {canWrite && (
          <Button asChild variant="outline" size="sm" className="gap-1">
            <Link href={`/a/academic/programs/${id}/edit`}>
              <Pencil className="h-4 w-4" /> Editar
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="glass-subtle">
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pensums</p>
            <p className="mt-1 text-2xl font-semibold">{curriculums.length}</p>
          </CardContent>
        </Card>
        <Card className="glass-subtle">
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Grupos activos
            </p>
            <p className="mt-1 text-2xl font-semibold">{activeGroups}</p>
          </CardContent>
        </Card>
        <Card className="glass-subtle">
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Cursos</p>
            <p className="mt-1 text-2xl font-semibold">{coursesCountRes}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-subtle">
        <CardHeader>
          <CardTitle className="text-base">Detalles</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Nombre</dt>
              <dd className="font-medium">{program.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Codigo</dt>
              <dd className="font-medium">
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{program.code}</code>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Modalidad</dt>
              <dd className="font-medium">{modalityLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Duracion</dt>
              <dd className="font-medium">
                {program.duration_periods} periodo
                {program.duration_periods === 1 ? '' : 's'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Descripcion</dt>
              <dd className="font-medium">{program.description || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Creado</dt>
              <dd className="font-medium">{formatDate(program.created_at)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
