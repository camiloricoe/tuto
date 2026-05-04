import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPaymentConcepts } from '@/lib/db/payments'
import { Card, CardContent } from '@/components/ui/card'
import NewChargeForm from './form'

export default async function NewChargePage() {
  const session = await requireSession()
  await requirePermission('payments:write')

  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }

  const tenantId = session.activeTenantId
  const admin = createAdminClient()

  // Fetch active tenant members
  const { data: memberships } = await admin
    .from('user_tenant_memberships')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('active', true)

  const userIds = (memberships ?? []).map((m) => m.user_id)

  // Fetch role codes to filter students
  const { data: userRolesWithCode } = userIds.length > 0
    ? await admin
        .from('user_roles')
        .select('user_id, roles(code)')
        .eq('tenant_id', tenantId)
        .is('revoked_at', null)
        .in('user_id', userIds)
    : { data: [] }

  const studentIds = new Set(
    (userRolesWithCode ?? [])
      .filter((ur) => (ur.roles as unknown as { code: string } | null)?.code === 'student')
      .map((ur) => ur.user_id),
  )

  // Fetch profiles for students
  const { data: profiles } = studentIds.size > 0
    ? await admin
        .from('user_profiles')
        .select('id, full_name')
        .in('id', Array.from(studentIds))
        .order('full_name')
    : { data: [] }

  const students = (profiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name ?? 'Sin nombre',
  }))

  const concepts = await getPaymentConcepts(tenantId)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nuevo Cargo</h1>

      <Card className="glass-subtle">
        <CardContent className="pt-6">
          <NewChargeForm students={students} concepts={concepts} />
        </CardContent>
      </Card>
    </div>
  )
}
