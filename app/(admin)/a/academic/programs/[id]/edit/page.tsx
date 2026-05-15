import { notFound } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { getProgramById } from '@/lib/db/academic'
import EditProgramForm from './form'

export default async function EditProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  await requirePermission('academic:write')

  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }
  const { id } = await params
  const program = await getProgramById(session.activeTenantId, id)
  if (!program) notFound()

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Editar Programa</h1>
      <EditProgramForm
        programId={program.id}
        defaults={{
          name: program.name,
          code: program.code,
          modality: program.modality,
          durationPeriods: program.duration_periods,
          description: program.description ?? '',
        }}
      />
    </div>
  )
}
