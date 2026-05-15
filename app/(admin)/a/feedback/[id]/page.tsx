import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormattedTime } from '@/components/shared/formatted-time'
import { CopyButton } from '@/components/shared/copy-button'
import { ticketToMarkdown } from '@/lib/feedback/markdown'
import { ArrowLeft } from 'lucide-react'
import { TicketControls } from './controls'
import { CommentForm } from './comment-form'

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  await requirePermission('feedback:read')
  const { id } = await params

  const admin = createAdminClient()
  const { data: ticket } = await admin
    .from('feedback_tickets')
    .select(
      'id, type, title, description, status, priority, target_url, target_selector, target_text, viewport_width, viewport_height, user_role, user_agent, created_at, updated_at, resolved_at, created_by, tenant_id, assigned_to',
    )
    .eq('id', id)
    .single()

  if (!ticket) notFound()
  if (!session.isSuperAdmin && ticket.tenant_id !== session.activeTenantId) notFound()

  const [reporterRes, assigneeRes, tenantRes, commentsRes] = await Promise.all([
    ticket.created_by
      ? admin.from('user_profiles').select('id, full_name').eq('id', ticket.created_by).single()
      : Promise.resolve({ data: null }),
    ticket.assigned_to
      ? admin.from('user_profiles').select('id, full_name').eq('id', ticket.assigned_to).single()
      : Promise.resolve({ data: null }),
    ticket.tenant_id
      ? admin.from('tenants').select('id, name').eq('id', ticket.tenant_id).single()
      : Promise.resolve({ data: null }),
    admin
      .from('feedback_comments')
      .select('id, body, is_internal, created_at, author_id')
      .eq('ticket_id', ticket.id)
      .order('created_at'),
  ])

  const commentAuthorIds = Array.from(
    new Set((commentsRes.data ?? []).map((c) => c.author_id).filter((x): x is string => !!x)),
  )
  const { data: commentAuthors } = commentAuthorIds.length
    ? await admin.from('user_profiles').select('id, full_name').in('id', commentAuthorIds)
    : { data: [] }
  const authorById = new Map((commentAuthors ?? []).map((p) => [p.id, p]))

  const enrichedComments = (commentsRes.data ?? []).map((c) => ({
    ...c,
    author_name: c.author_id ? authorById.get(c.author_id)?.full_name ?? null : null,
  }))

  const tenantMembersQuery = ticket.tenant_id
    ? await admin
        .from('user_tenant_memberships')
        .select('user_id')
        .eq('tenant_id', ticket.tenant_id)
        .eq('active', true)
    : { data: [] }
  const memberIds = (tenantMembersQuery.data ?? []).map((m) => m.user_id)
  const { data: assignableUsers } = memberIds.length
    ? await admin.from('user_profiles').select('id, full_name').in('id', memberIds)
    : { data: [] }

  const markdown = ticketToMarkdown({
    ...ticket,
    reporter_name: reporterRes.data?.full_name ?? null,
    tenant_name: tenantRes.data?.name ?? null,
    comments: enrichedComments.map((c) => ({
      author_name: c.author_name,
      body: c.body,
      is_internal: c.is_internal,
      created_at: c.created_at,
    })),
  })

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/a/feedback" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <CopyButton text={markdown} label="Copiar como prompt" />
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-xl">{ticket.title}</CardTitle>
          <p className="text-xs text-muted-foreground">
            <span className="uppercase font-semibold">{ticket.type}</span>
            {' · '}
            Reportado por {reporterRes.data?.full_name ?? 'usuario'}
            {ticket.user_role && ` (${ticket.user_role})`}
            {tenantRes.data && ` en ${tenantRes.data.name}`}
            {' · '}
            <FormattedTime value={ticket.created_at} />
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Descripcion</h3>
            <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 text-xs rounded-md border bg-muted/30 p-3">
            {ticket.target_url && (
              <div>
                <p className="font-semibold text-muted-foreground">URL</p>
                <p className="break-all">{ticket.target_url}</p>
              </div>
            )}
            {ticket.target_selector && (
              <div>
                <p className="font-semibold text-muted-foreground">Selector</p>
                <p className="font-mono break-all">{ticket.target_selector}</p>
              </div>
            )}
            {ticket.target_text && (
              <div className="sm:col-span-2">
                <p className="font-semibold text-muted-foreground">Texto del elemento</p>
                <p>"{ticket.target_text}"</p>
              </div>
            )}
            {ticket.viewport_width && (
              <div>
                <p className="font-semibold text-muted-foreground">Viewport</p>
                <p>{ticket.viewport_width} x {ticket.viewport_height}</p>
              </div>
            )}
            {ticket.user_agent && (
              <div className="sm:col-span-2">
                <p className="font-semibold text-muted-foreground">User Agent</p>
                <p className="text-[10px] break-all">{ticket.user_agent}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <TicketControls
        ticketId={ticket.id}
        status={ticket.status}
        priority={ticket.priority}
        assignedTo={ticket.assigned_to}
        assignableUsers={assignableUsers ?? []}
        canManage={session.permissions.has('feedback:manage')}
      />

      <Card className="glass-subtle">
        <CardHeader>
          <CardTitle className="text-base">Comentarios ({enrichedComments.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {enrichedComments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin comentarios.</p>
          ) : (
            <ul className="space-y-3">
              {enrichedComments.map((c) => (
                <li
                  key={c.id}
                  className={`rounded-md border p-3 text-sm ${c.is_internal ? 'bg-amber-500/5 border-amber-500/20' : 'bg-card'}`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-1">
                    <span className="font-medium text-foreground">{c.author_name ?? 'Usuario'}</span>
                    <span>
                      {c.is_internal && <span className="mr-2 font-semibold text-amber-600">INTERNO</span>}
                      <FormattedTime value={c.created_at} variant="relative" />
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{c.body}</p>
                </li>
              ))}
            </ul>
          )}

          <CommentForm ticketId={ticket.id} canMarkInternal={session.permissions.has('feedback:manage')} />
        </CardContent>
      </Card>
    </div>
  )
}
