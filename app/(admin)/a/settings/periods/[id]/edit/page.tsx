import { notFound } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import EditPeriodForm from './form'

export default async function EditPeriodPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  await requirePermission('academic:write')
  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }
  const { id } = await params
  const admin = createAdminClient()
  const { data: period } = await admin
    .from('academic_periods')
    .select('id, name, code, kind, starts_on, ends_on, active')
    .eq('id', id)
    .eq('tenant_id', session.activeTenantId)
    .is('deleted_at', null)
    .single()
  if (!period) notFound()

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Editar periodo academico</h1>
      <EditPeriodForm
        periodId={period.id}
        defaults={{
          name: period.name,
          code: period.code,
          kind: period.kind,
          starts_on: period.starts_on,
          ends_on: period.ends_on,
          active: period.active,
        }}
      />
    </div>
  )
}
