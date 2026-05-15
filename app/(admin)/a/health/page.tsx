import { requireSession } from '@/lib/auth/session'
import { requireSuperAdmin } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormattedTime } from '@/components/shared/formatted-time'
import { CheckCircle2, AlertTriangle, XCircle, Activity } from 'lucide-react'

export default async function HealthPage() {
  await requireSession()
  await requireSuperAdmin()

  const admin = createAdminClient()
  const { data: runs } = await admin
    .from('platform_test_runs')
    .select('id, ran_at, source, trigger_actor, commit_sha, branch, environment, unit_total, unit_passed, unit_failed, e2e_total, e2e_passed, e2e_failed, e2e_skipped, duration_ms, status')
    .order('ran_at', { ascending: false })
    .limit(60)

  const list = runs ?? []
  const latest = list[0]
  const last30 = list.slice(0, 30)
  const last30Pass = last30.filter((r) => r.status === 'passed').length
  const passRate = last30.length > 0 ? Math.round((last30Pass / last30.length) * 100) : null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Salud de la plataforma</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatusCard latest={latest} />

        <Card className="glass-subtle">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tests en ultimo run
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {latest ? latest.unit_total + latest.e2e_total : '—'}
            </p>
            {latest && (
              <p className="mt-1 text-xs text-muted-foreground">
                {latest.unit_passed + latest.e2e_passed} ok ·{' '}
                {latest.unit_failed + latest.e2e_failed} fallos
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-subtle">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pass rate ultimas 30 corridas
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{passRate !== null ? `${passRate}%` : '—'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {last30Pass}/{last30.length} verdes
            </p>
          </CardContent>
        </Card>

        <Card className="glass-subtle">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Duracion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {latest ? Math.round(latest.duration_ms / 1000) + 's' : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-subtle">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Ultimas corridas ({list.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin corridas registradas. POST a /api/health/test-run con el header
              <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">x-tuto-health-token</code>
              para ingestar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-3">Cuando</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2 pr-3">Origen</th>
                    <th className="py-2 pr-3">Branch</th>
                    <th className="py-2 pr-3">Unit</th>
                    <th className="py-2 pr-3">E2E</th>
                    <th className="py-2 pr-3">Duracion</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {list.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                        <FormattedTime value={r.ran_at} />
                      </td>
                      <td className="py-2 pr-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="py-2 pr-3 text-xs uppercase">{r.source}</td>
                      <td className="py-2 pr-3 text-xs font-mono">
                        {r.branch ?? '—'}
                        {r.commit_sha && ` · ${r.commit_sha.slice(0, 7)}`}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {r.unit_passed}/{r.unit_total}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {r.e2e_passed}/{r.e2e_total}
                        {r.e2e_skipped > 0 && ` (+${r.e2e_skipped} skip)`}
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {Math.round(r.duration_ms / 1000)}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusCard({ latest }: { latest: { status: string; ran_at: string } | undefined }) {
  if (!latest) {
    return (
      <Card className="glass-subtle">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Ultimo run</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-muted-foreground">Sin datos</p>
        </CardContent>
      </Card>
    )
  }
  const Icon =
    latest.status === 'passed' ? CheckCircle2 : latest.status === 'partial' ? AlertTriangle : XCircle
  const colorClass =
    latest.status === 'passed'
      ? 'text-green-500'
      : latest.status === 'partial'
      ? 'text-amber-500'
      : 'text-destructive'
  return (
    <Card className="glass-subtle">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Ultimo run</CardTitle>
        <Icon className={`h-4 w-4 ${colorClass}`} />
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold capitalize ${colorClass}`}>{latest.status}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          <FormattedTime value={latest.ran_at} variant="relative" />
        </p>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    passed: 'bg-green-500/10 text-green-600',
    partial: 'bg-amber-500/10 text-amber-600',
    failed: 'bg-destructive/10 text-destructive',
    running: 'bg-blue-500/10 text-blue-600',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${colors[status] ?? ''}`}>
      {status}
    </span>
  )
}
