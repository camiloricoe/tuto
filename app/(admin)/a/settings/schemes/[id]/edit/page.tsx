import { notFound } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import EditSchemeForm from './form'

export default async function EditSchemePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  await requirePermission('academic:write')
  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }
  const { id } = await params
  const admin = createAdminClient()
  const { data: scheme } = await admin
    .from('grading_schemes')
    .select('id, name, scale_min, scale_max, passing_grade, uses_letters')
    .eq('id', id)
    .eq('tenant_id', session.activeTenantId)
    .is('deleted_at', null)
    .single()
  if (!scheme) notFound()

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Editar esquema de calificacion</h1>
      <EditSchemeForm
        schemeId={scheme.id}
        defaults={{
          name: scheme.name,
          scale_min: scheme.scale_min,
          scale_max: scheme.scale_max,
          passing_grade: scheme.passing_grade,
          uses_letters: scheme.uses_letters,
        }}
      />
    </div>
  )
}
