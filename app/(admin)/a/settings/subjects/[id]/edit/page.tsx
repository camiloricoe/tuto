import { notFound } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import EditSubjectForm from './form'

export default async function EditSubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  await requirePermission('academic:write')
  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }
  const { id } = await params
  const admin = createAdminClient()
  const [{ data: subject }, { data: programs }] = await Promise.all([
    admin
      .from('subjects')
      .select('id, name, code, program_id, credits')
      .eq('id', id)
      .eq('tenant_id', session.activeTenantId)
      .is('deleted_at', null)
      .single(),
    admin
      .from('academic_programs')
      .select('id, name')
      .eq('tenant_id', session.activeTenantId)
      .is('deleted_at', null)
      .order('name'),
  ])
  if (!subject) notFound()

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Editar materia</h1>
      <EditSubjectForm
        subjectId={subject.id}
        programs={programs ?? []}
        defaults={{
          name: subject.name,
          code: subject.code,
          program_id: subject.program_id,
          credits: subject.credits ?? null,
        }}
      />
    </div>
  )
}
