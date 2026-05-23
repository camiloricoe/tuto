import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { getPrograms } from '@/lib/db/academic'
import NewCurriculumForm from './form'

export default async function NewCurriculumPage() {
  const session = await requireSession()
  await requirePermission('curriculums:write')

  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }

  const programs = await getPrograms(session.activeTenantId)
  return <NewCurriculumForm programs={programs} />
}
