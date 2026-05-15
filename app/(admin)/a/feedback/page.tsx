import Link from 'next/link'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import { FormattedTime } from '@/components/shared/formatted-time'
import { CopyButton } from '@/components/shared/copy-button'
import { ticketsToMarkdown } from '@/lib/feedback/markdown'
import { FEEDBACK_STATUSES, FEEDBACK_TYPES, FEEDBACK_PRIORITIES } from '@/lib/validators/feedback'
import { Bug, Lightbulb, HelpCircle, ArrowRight } from 'lucide-react'

type SearchParams = Promise<{ status?: string; type?: string; priority?: string }>

const TYPE_ICON = { bug: Bug, suggestion: Lightbulb, question: HelpCircle }
const STATUS_COLOR: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-600',
  triaged: 'bg-amber-500/10 text-amber-600',
  in_progress: 'bg-purple-500/10 text-purple-600',
  resolved: 'bg-green-500/10 text-green-600',
  declined: 'bg-muted text-muted-foreground',
}
const PRIORITY_COLOR: Record<string, string> = {
  low: 'text-muted-foreground',
  medium: 'text-foreground',
  high: 'text-amber-600',
  critical: 'text-destructive',
}

export default async function FeedbackListPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession()
  await requirePermission('feedback:read')

  const params = await searchParams
  const admin = createAdminClient()

  let q = admin
    .from('feedback_tickets')
    .select(
      'id, type, title, description, status, priority, target_url, target_selector, target_text, viewport_width, viewport_height, user_role, user_agent, created_at, created_by, tenant_id',
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (!session.isSuperAdmin && session.activeTenantId) {
    q = q.eq('tenant_id', session.activeTenantId)
  }
  if (params.status) q = q.eq('status', params.status)
  if (params.type) q = q.eq('type', params.type)
  if (params.priority) q = q.eq('priority', params.priority)

  const { data: tickets } = await q

  const userIds = Array.from(new Set((tickets ?? []).map((t) => t.created_by).filter((x): x is string => !!x)))
  const tenantIds = Array.from(new Set((tickets ?? []).map((t) => t.tenant_id).filter((x): x is string => !!x)))

  const [profilesRes, tenantsRes] = await Promise.all([
    userIds.length ? admin.from('user_profiles').select('id, full_name').in('id', userIds) : Promise.resolve({ data: [] }),
    tenantIds.length ? admin.from('tenants').select('id, name').in('id', tenantIds) : Promise.resolve({ data: [] }),
  ])
  const profileById = new Map((profilesRes.data ?? []).map((p) => [p.id, p]))
  const tenantById = new Map((tenantsRes.data ?? []).map((t: { id: string; name: string }) => [t.id, t]))

  const enriched = (tickets ?? []).map((t) => ({
    ...t,
    reporter_name: t.created_by ? profileById.get(t.created_by)?.full_name ?? null : null,
    tenant_name: t.tenant_id ? tenantById.get(t.tenant_id)?.name ?? null : null,
  }))

  const allMarkdown = ticketsToMarkdown(enriched)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Feedback ({enriched.length})</h1>
        <CopyButton text={allMarkdown} label="Copiar todos como prompt" />
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <select name="status" defaultValue={params.status ?? ''} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">Todos</option>
            {FEEDBACK_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Tipo</label>
          <select name="type" defaultValue={params.type ?? ''} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">Todos</option>
            {FEEDBACK_TYPES.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Prioridad</label>
          <select name="priority" defaultValue={params.priority ?? ''} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">Todas</option>
            {FEEDBACK_PRIORITIES.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
        <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Filtrar
        </button>
      </form>

      <div className="grid gap-3">
        {enriched.length === 0 ? (
          <p className="text-muted-foreground">No hay tickets.</p>
        ) : (
          enriched.map((t) => {
            const Icon = TYPE_ICON[t.type as keyof typeof TYPE_ICON] ?? Bug
            return (
              <Link key={t.id} href={`/a/feedback/${t.id}`} className="block">
                <Card className="glass-subtle hover:bg-accent/30 transition-colors">
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Icon className="h-5 w-5 mt-1 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLOR[t.status] ?? ''}`}>
                            {t.status}
                          </span>
                          <span className={`text-[10px] uppercase font-semibold ${PRIORITY_COLOR[t.priority] ?? ''}`}>
                            {t.priority}
                          </span>
                          <p className="font-medium truncate">{t.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t.reporter_name ?? 'Anonimo'}
                          {t.tenant_name && ` · ${t.tenant_name}`}
                          {' · '}
                          <FormattedTime value={t.created_at} variant="relative" />
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
