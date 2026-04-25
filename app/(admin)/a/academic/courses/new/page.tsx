import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { getSubjects, getPeriods, getGradingSchemes } from '@/lib/db/academic'
import NewCourseForm from './form'

export default async function NewCoursePage() {
  const session = await requireSession()
  await requirePermission('academic:write')

  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }

  const [subjects, periods, schemes] = await Promise.all([
    getSubjects(session.activeTenantId),
    getPeriods(session.activeTenantId),
    getGradingSchemes(session.activeTenantId),
  ])

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Nuevo Curso</h1>
      <NewCourseForm subjects={subjects} periods={periods} schemes={schemes} />
    </div>
  )
}
