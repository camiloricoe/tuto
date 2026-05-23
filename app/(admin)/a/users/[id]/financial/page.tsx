import { notFound } from 'next/navigation'

import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import {
  getUserProfile,
  getUserCharges,
  getUserPayments,
  getUserAccountStatement,
} from '@/lib/db/users'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type UserFinancialPageProps = {
  params: Promise<{ id: string }>
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const moneyFmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const dateFmt = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' })

const ROW_LIMIT = 20

const chargeStatusLabel: Record<string, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagado',
  void: 'Anulado',
}

const paymentStatusLabel: Record<string, string> = {
  confirmed: 'Confirmado',
  pending: 'Pendiente',
  rejected: 'Rechazado',
  reversed: 'Reversado',
  applied: 'Aplicado',
}

const methodLabel: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  pse: 'PSE',
  check: 'Cheque',
  other: 'Otro',
}

export default async function UserFinancialPage({
  params,
}: UserFinancialPageProps) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const session = await requireSession()
  await requirePermission('users:read')
  if (!session.activeTenantId) notFound()

  const profile = await getUserProfile(session.activeTenantId, id)
  if (!profile) notFound()

  const [statement, charges, payments] = await Promise.all([
    getUserAccountStatement(session.activeTenantId, id),
    getUserCharges(session.activeTenantId, id),
    getUserPayments(session.activeTenantId, id),
  ])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const visibleCharges = charges.slice(0, ROW_LIMIT)
  const visiblePayments = payments.slice(0, ROW_LIMIT)

  return (
    <div className="space-y-6">
      <Card className="glass-subtle">
        <CardHeader>
          <CardTitle className="text-base">Estado de cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          {!statement ? (
            <p className="text-sm text-muted-foreground">
              Sin movimientos financieros.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Total cobrado"
                value={moneyFmt.format(statement.total_charged)}
              />
              <Stat
                label="Total pagado"
                value={moneyFmt.format(statement.total_paid)}
              />
              <Stat
                label="Saldo"
                value={moneyFmt.format(statement.balance_due)}
                emphasized={statement.balance_due > 0}
              />
              <Stat
                label="Mora"
                value={String(statement.overdue_count)}
                emphasized={statement.overdue_count > 0}
                hint={
                  statement.next_due_date
                    ? `Próximo vence ${dateFmt.format(
                        new Date(statement.next_due_date),
                      )}`
                    : undefined
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-subtle">
        <CardHeader>
          <CardTitle className="text-base">Cargos</CardTitle>
        </CardHeader>
        <CardContent>
          {visibleCharges.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin cargos registrados.</p>
          ) : (
            <ul className="divide-y">
              {visibleCharges.map((c) => {
                const dueDate = new Date(c.due_date)
                const isOverdue =
                  dueDate < today &&
                  (c.status === 'pending' || c.status === 'partial')
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">
                        {c.concept_name || 'Concepto sin nombre'}
                      </p>
                      <p
                        className={
                          isOverdue
                            ? 'text-xs text-destructive'
                            : 'text-xs text-muted-foreground'
                        }
                      >
                        Vence {dateFmt.format(dueDate)}
                        {isOverdue && ' · en mora'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-mono tabular-nums">
                        {moneyFmt.format(c.amount)}
                      </span>
                      <ChargeStatusBadge status={c.status} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="glass-subtle">
        <CardHeader>
          <CardTitle className="text-base">Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {visiblePayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin pagos registrados.</p>
          ) : (
            <ul className="divide-y">
              {visiblePayments.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      {methodLabel[p.method] ?? p.method}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dateFmt.format(new Date(p.paid_on))}
                      {p.reference && ` · ${p.reference}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-mono tabular-nums">
                      {moneyFmt.format(p.amount)}
                    </span>
                    <PaymentStatusBadge status={p.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  emphasized,
}: {
  label: string
  value: string
  hint?: string
  emphasized?: boolean
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={
          emphasized
            ? 'text-2xl font-semibold tabular-nums text-destructive'
            : 'text-2xl font-semibold tabular-nums'
        }
      >
        {value}
      </p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function ChargeStatusBadge({ status }: { status: string }) {
  const label = chargeStatusLabel[status] ?? status
  const tone =
    status === 'paid'
      ? 'bg-green-500/10 text-green-700 dark:text-green-300'
      : status === 'partial'
        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
        : status === 'void'
          ? 'bg-muted text-muted-foreground'
          : 'bg-primary/10 text-primary'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}
    >
      {label}
    </span>
  )
}

function PaymentStatusBadge({ status }: { status: string }) {
  const label = paymentStatusLabel[status] ?? status
  const tone =
    status === 'confirmed' || status === 'applied'
      ? 'bg-green-500/10 text-green-700 dark:text-green-300'
      : status === 'rejected' || status === 'reversed'
        ? 'bg-destructive/10 text-destructive'
        : 'bg-primary/10 text-primary'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}
    >
      {label}
    </span>
  )
}
