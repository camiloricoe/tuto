import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import {
  getCurriculumById,
  getCurriculumSubjects,
  getSubjectsAvailableForCurriculum,
} from '@/lib/db/curriculums'
import { getTenantTerms } from '@/lib/terminology/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CurriculumHeaderActions } from './header-actions'
import { SubjectsEditor } from './subjects-editor'

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

type CurriculumSubjectRow = {
  id: string
  curriculum_id: string
  cycle: number
  credits: number | null
  is_required: boolean
  sequence: number
  subject_id: string
  subjects: { id: string; name: string; code: string; credits: number | null } | null
}

export default async function CurriculumDetailPage({
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

  const terms = await getTenantTerms(session.activeTenantId)

  let curriculum
  try {
    curriculum = await getCurriculumById(session.activeTenantId, id)
  } catch {
    notFound()
  }
  if (!curriculum) notFound()

  const subjectsRaw = (await getCurriculumSubjects(
    session.activeTenantId,
    id,
  )) as unknown as CurriculumSubjectRow[]

  const canWrite = session.permissions.has('curriculums:write')
  const canEditSubjects = canWrite && curriculum.status === 'draft'

  const availableSubjects = canEditSubjects
    ? await getSubjectsAvailableForCurriculum(session.activeTenantId, id)
    : []

  const program = curriculum.academic_programs as unknown as
    | { id: string; name: string; code: string }
    | null

  const admin = createAdminClient()
  const { count: programSubjectsCount } = await admin
    .from('subjects')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', session.activeTenantId)
    .eq('program_id', curriculum.program_id)
    .is('deleted_at', null)
  const programHasSubjects = (programSubjectsCount ?? 0) > 0

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/a/academic/curriculums"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {terms.curriculum.plural}
        </Link>
      </div>

      <Card className="glass-subtle">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-xl">{curriculum.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {program?.name ?? `${terms.program.singular} desconocido`}
                {program?.code ? ` · ${program.code}` : ''} · v{curriculum.version} ·{' '}
                {curriculum.cycles} ciclos
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(
                  curriculum.status,
                )}`}
              >
                {statusLabel(curriculum.status)}
              </span>
              {canWrite && (
                <CurriculumHeaderActions
                  curriculumId={curriculum.id}
                  status={curriculum.status}
                  subjectCount={subjectsRaw.length}
                />
              )}
            </div>
          </div>
        </CardHeader>
        {curriculum.notes && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{curriculum.notes}</p>
          </CardContent>
        )}
      </Card>

      <SubjectsEditor
        curriculum={{ id: curriculum.id, cycles: curriculum.cycles, status: curriculum.status }}
        subjects={subjectsRaw.map((s) => ({
          id: s.id,
          cycle: s.cycle,
          credits: s.credits,
          isRequired: s.is_required,
          sequence: s.sequence,
          subject: s.subjects
            ? {
                id: s.subjects.id,
                name: s.subjects.name,
                code: s.subjects.code,
                credits: s.subjects.credits,
              }
            : null,
        }))}
        availableSubjects={availableSubjects}
        canEdit={canEditSubjects}
        programHasSubjects={programHasSubjects}
      />

      {!canEditSubjects && curriculum.status !== 'draft' && (
        <Card className="glass-subtle">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              Este {terms.curriculum.singular.toLowerCase()} está{' '}
              {statusLabel(curriculum.status).toLowerCase()}. Las{' '}
              {terms.subject.plural.toLowerCase()} no se pueden modificar.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link href="/a/academic/curriculums">Volver al listado</Link>
        </Button>
      </div>
    </div>
  )
}
