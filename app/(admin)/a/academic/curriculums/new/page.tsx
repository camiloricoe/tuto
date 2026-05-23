import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { getPrograms } from '@/lib/db/academic'
import { getTenantTerms } from '@/lib/terminology/server'
import NewCurriculumForm from './form'

export default async function NewCurriculumPage() {
  const session = await requireSession()
  await requirePermission('curriculums:write')

  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }

  const [programs, terms] = await Promise.all([
    getPrograms(session.activeTenantId),
    getTenantTerms(session.activeTenantId),
  ])
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        Nuevo {terms.curriculum.singular.toLowerCase()}
      </h1>
      <NewCurriculumForm programs={programs} />
    </div>
  )
}
