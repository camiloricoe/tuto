import { requireSession } from '@/lib/auth/session'
import { getStudentCharges, getStudentPayments, getStudentAccountStatement } from '@/lib/db/payments'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function StudentPaymentsPage() {
  const session = await requireSession()
  const tenantId = session.activeTenantId ?? ''
  const studentId = session.userId

  const [charges, payments, statement] = await Promise.all([
    getStudentCharges(tenantId, studentId),
    getStudentPayments(tenantId, studentId),
    getStudentAccountStatement(tenantId, studentId),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Mi Estado de Cuenta</h1>

      {statement && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="glass-subtle">
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">Total cargado</p>
              <p className="text-xl font-semibold">${(statement.total_charged ?? 0).toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="glass-subtle">
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">Total pagado</p>
              <p className="text-xl font-semibold">${(statement.total_paid ?? 0).toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="glass-subtle">
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">Saldo pendiente</p>
              <p className="text-xl font-semibold text-destructive">
                ${(statement.balance_due ?? 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">Cargos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {charges.map((charge) => {
              const concept = charge.payment_concepts as unknown as { name: string } | null
              return (
                <div key={charge.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{concept?.name ?? 'Cargo'}</p>
                    <p className="text-xs text-muted-foreground">Vence: {charge.due_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${charge.amount.toFixed(2)}</p>
                    <p className="text-xs capitalize text-muted-foreground">{charge.status}</p>
                  </div>
                </div>
              )
            })}
            {charges.length === 0 && (
              <p className="py-3 text-sm text-muted-foreground">No hay cargos registrados.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">Historial de pagos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium capitalize">{payment.method}</p>
                  <p className="text-xs text-muted-foreground">{payment.paid_on}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {payment.currency} {payment.amount.toFixed(2)}
                  </p>
                  <p className="text-xs capitalize text-muted-foreground">{payment.status}</p>
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <p className="py-3 text-sm text-muted-foreground">No hay pagos registrados.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
