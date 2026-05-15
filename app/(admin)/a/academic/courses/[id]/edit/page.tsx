import { notFound } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSubjects, getPeriods, getGradingSchemes } from '@/lib/db/academic'
import EditCourseForm from './form'

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  await requirePermission('academic:write')
  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }
  const { id } = await params
  const admin = createAdminClient()
  const [{ data: course }, subjects, periods, schemes] = await Promise.all([
    admin
      .from('courses')
      .select('id, subject_id, period_id, teacher_id, section_code, grading_scheme_id, max_students, status')
      .eq('id', id)
      .eq('tenant_id', session.activeTenantId)
      .is('deleted_at', null)
      .single(),
    getSubjects(session.activeTenantId),
    getPeriods(session.activeTenantId),
    getGradingSchemes(session.activeTenantId),
  ])
  if (!course) notFound()

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Editar curso</h1>
      <EditCourseForm
        courseId={course.id}
        subjects={subjects}
        periods={periods}
        schemes={schemes}
        defaults={{
          subjectId: course.subject_id,
          periodId: course.period_id,
          gradingSchemeId: course.grading_scheme_id,
          sectionCode: course.section_code ?? '',
          maxStudents: course.max_students ?? null,
        }}
      />
    </div>
  )
}
