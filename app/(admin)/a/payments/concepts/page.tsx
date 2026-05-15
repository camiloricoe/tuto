import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { getPaymentConcepts } from '@/lib/db/payments'
import { Card, CardContent } from '@/components/ui/card'
import AddConceptForm from './add-form'
import { ConceptRowActions } from './row-actions'

export default async function PaymentConceptsPage() {
  const session = await requireSession()
  await requirePermission('payments:read')

  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }

  const concepts = await getPaymentConcepts(session.activeTenantId)
  const canWrite = session.permissions.has('payments:write')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Conceptos de Pago</h1>
      </div>

      {canWrite && (
        <Card className="glass">
          <CardContent className="pt-6">
            <AddConceptForm />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {concepts.map((concept) => (
          <Card key={concept.id} className="glass-subtle">
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{concept.name}</p>
                <p className="text-sm text-muted-foreground">
                  {concept.code}
                  {concept.recurring ? ' · Recurrente' : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {concept.default_amount != null && (
                  <p className="font-semibold whitespace-nowrap">${concept.default_amount.toFixed(2)}</p>
                )}
                <ConceptRowActions conceptId={concept.id} canWrite={canWrite} />
              </div>
            </CardContent>
          </Card>
        ))}
        {concepts.length === 0 && (
          <p className="text-muted-foreground">No hay conceptos registrados.</p>
        )}
      </div>
    </div>
  )
}
