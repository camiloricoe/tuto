import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { getPrograms } from '@/lib/db/academic'
import { createAdminClient } from '@/lib/supabase/admin'
import NewGroupForm from './form'

export default async function NewGroupPage() {
  const session = await requireSession()
  await requirePermission('groups:write')

  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }

  const programs = await getPrograms(session.activeTenantId)

  const admin = createAdminClient()
  const { data: curriculums } = await admin
    .from('curriculums')
    .select('id, name, version, program_id')
    .eq('tenant_id', session.activeTenantId)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('version', { ascending: false })

  const curriculumsByProgram: Record<
    string,
    Array<{ id: string; name: string; version: string }>
  > = {}
  for (const c of curriculums ?? []) {
    const bucket = curriculumsByProgram[c.program_id] ?? []
    bucket.push({ id: c.id, name: c.name, version: c.version })
    curriculumsByProgram[c.program_id] = bucket
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Nuevo grupo</h1>
      <NewGroupForm programs={programs} curriculumsByProgram={curriculumsByProgram} />
    </div>
  )
}
