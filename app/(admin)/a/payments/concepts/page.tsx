import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { getPaymentConcepts } from '@/lib/db/payments'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import AddConceptForm from './add-form'

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
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">{concept.name}</p>
                <p className="text-sm text-muted-foreground">
                  {concept.code}
                  {concept.recurring ? ' · Recurrente' : ''}
                </p>
              </div>
              {concept.default_amount != null && (
                <p className="font-semibold">${concept.default_amount.toFixed(2)}</p>
              )}
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
