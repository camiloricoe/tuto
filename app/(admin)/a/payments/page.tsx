import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { getPayments } from '@/lib/db/payments'
import { Card, CardContent } from '@/components/ui/card'

export default async function PaymentsPage() {
  const session = await requireSession()
  await requirePermission('payments:read')

  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }

  const payments = await getPayments(session.activeTenantId, 50)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Pagos Recientes</h1>

      <div className="grid gap-3">
        {payments.map((payment) => {
          const student = payment.user_profiles as unknown as { full_name: string } | null
          return (
            <Card key={payment.id} className="glass-subtle">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{student?.full_name ?? 'Estudiante desconocido'}</p>
                  <p className="text-sm text-muted-foreground">
                    {payment.method} · {payment.paid_on}
                    {payment.reference ? ` · Ref: ${payment.reference}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {payment.currency} {payment.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{payment.status}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {payments.length === 0 && (
          <p className="text-muted-foreground">No hay pagos registrados.</p>
        )}
      </div>
    </div>
  )
}
