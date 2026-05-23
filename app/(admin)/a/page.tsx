import { requireSession } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantTerms } from '@/lib/terminology/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormattedTime } from '@/components/shared/formatted-time'
import { Users, BookOpen, AlertCircle, Activity } from 'lucide-react'

export default async function AdminDashboard() {
  const session = await requireSession()
  const tenantId = session.activeTenantId ?? ''
  const admin = createAdminClient()

  const terms = await getTenantTerms(tenantId)

  const [enrollmentsRes, coursesRes, overdueRes, activityRes] = await Promise.all([
    admin
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null),
    admin
      .from('courses')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null),
    admin
      .from('v_overdue_charges')
      .select('charge_id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    admin
      .from('activity_log')
      .select('id, action_code, summary, occurred_at')
      .eq('tenant_id', tenantId)
      .order('occurred_at', { ascending: false })
      .limit(10),
  ])

  const enrollmentCount = enrollmentsRes.count ?? 0
  const courseCount = coursesRes.count ?? 0
  const overdueCount = overdueRes.count ?? 0
  const recentActivity = activityRes.data ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-subtle">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estudiantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{enrollmentCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Matriculas activas</p>
          </CardContent>
        </Card>

        <Card className="glass-subtle">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{terms.course.plural}</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{courseCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">{terms.course.plural} activos</p>
          </CardContent>
        </Card>

        <Card className="glass-subtle">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cargos vencidos
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{overdueCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Requieren atencion</p>
          </CardContent>
        </Card>

        <Card className="glass-subtle">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actividad</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{recentActivity.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Eventos recientes</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-subtle">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay actividad reciente.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentActivity.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{entry.summary ?? entry.action_code}</p>
                    <p className="text-xs text-muted-foreground">{entry.action_code}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    <FormattedTime value={entry.occurred_at} variant="relative" />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
