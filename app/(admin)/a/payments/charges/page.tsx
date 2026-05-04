import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function ChargesPage() {
  const session = await requireSession()
  await requirePermission('payments:read')

  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }

  const tenantId = session.activeTenantId
  const admin = createAdminClient()

  const { data: charges } = await admin
    .from('student_charges')
    .select(
      'id, amount, status, due_date, notes, student_id, user_profiles!student_charges_student_id_fkey(full_name), payment_concepts(name, code)',
    )
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('due_date', { ascending: false })
    .limit(100)

  const canWrite = session.permissions.has('payments:write')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cargos de Estudiantes</h1>
        {canWrite && (
          <Button asChild>
            <a href="/a/payments/charges/new">Nuevo cargo</a>
          </Button>
        )}
      </div>

      <div className="grid gap-3">
        {(charges ?? []).map((charge) => {
          const student = charge.user_profiles as unknown as { full_name: string } | null
          const concept = charge.payment_concepts as unknown as { name: string; code: string } | null
          return (
            <Card key={charge.id} className="glass-subtle">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{student?.full_name ?? 'Estudiante desconocido'}</p>
                  <p className="text-sm text-muted-foreground">
                    {concept?.name ?? '—'}
                    {concept?.code ? ` (${concept.code})` : ''}
                    {charge.due_date ? ` · Vence: ${charge.due_date}` : ''}
                  </p>
                  {charge.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5">{charge.notes}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold">${charge.amount.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground capitalize">{charge.status}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {(!charges || charges.length === 0) && (
          <p className="text-muted-foreground">No hay cargos registrados.</p>
        )}
      </div>
    </div>
  )
}
