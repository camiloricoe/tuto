import Link from 'next/link'
import type { Route } from 'next'
import { notFound } from 'next/navigation'

import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { getProgramById } from '@/lib/db/academic'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantTerms } from '@/lib/terminology/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const COURSE_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  open: 'Abierto',
  in_progress: 'En curso',
  closed: 'Cerrado',
  archived: 'Archivado',
}

const COURSE_STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  open: 'bg-primary/10 text-primary',
  in_progress: 'bg-primary/10 text-primary',
  closed: 'bg-secondary text-secondary-foreground',
  archived: 'bg-muted text-muted-foreground',
}

type CourseRow = {
  id: string
  section_code: string | null
  status: string
  subjects: { id: string; name: string; code: string | null } | null
  academic_periods: { id: string; name: string; code: string | null } | null
}

export default async function ProgramCoursesPage({
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
  const [program, terms] = await Promise.all([
    getProgramById(tenantId, id).catch(() => null),
    getTenantTerms(tenantId),
  ])
  if (!program) notFound()

  const admin = createAdminClient()
  const { data: subjects } = await admin
    .from('subjects')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('program_id', id)
    .is('deleted_at', null)

  const subjectIds = (subjects ?? []).map((s) => s.id)

  let courses: CourseRow[] = []
  if (subjectIds.length > 0) {
    const { data, error } = await admin
      .from('courses')
      .select(
        `id, section_code, status,
         subjects!inner(id, name, code),
         academic_periods(id, name, code)`,
      )
      .eq('tenant_id', tenantId)
      .in('subject_id', subjectIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    courses = ((data ?? []) as unknown) as CourseRow[]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{terms.course.plural} del {terms.program.singular.toLowerCase()}</h2>
      </div>

      <div className="grid gap-3">
        {courses.map((course) => {
          const statusLabel = COURSE_STATUS_LABELS[course.status] ?? course.status
          const statusClass =
            COURSE_STATUS_CLASSES[course.status] ?? 'bg-muted text-muted-foreground'
          return (
            <Card key={course.id} className="glass-subtle">
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <Link href={`/a/academic/courses/${course.id}` as Route} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {course.subjects?.name ?? 'Materia desconocida'}
                    </p>
                    {course.section_code && (
                      <span className="text-xs text-muted-foreground">
                        Seccion {course.section_code}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {course.subjects?.code ? `${course.subjects.code} · ` : ''}
                    {course.academic_periods?.name ?? 'Sin periodo'}
                  </p>
                </Link>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/a/academic/courses/${course.id}` as Route}>Abrir</Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
        {courses.length === 0 && (
          <p className="text-muted-foreground">No hay cursos para este programa.</p>
        )}
      </div>
    </div>
  )
}
