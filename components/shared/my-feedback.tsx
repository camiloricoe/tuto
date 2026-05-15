import { createAdminClient } from '@/lib/supabase/admin'
import { requireSession } from '@/lib/auth/session'
import { Card, CardContent } from '@/components/ui/card'
import { FormattedTime } from '@/components/shared/formatted-time'
import { Bug, Lightbulb, HelpCircle } from 'lucide-react'

const TYPE_ICON = { bug: Bug, suggestion: Lightbulb, question: HelpCircle }
const STATUS_COLOR: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-600',
  triaged: 'bg-amber-500/10 text-amber-600',
  in_progress: 'bg-purple-500/10 text-purple-600',
  resolved: 'bg-green-500/10 text-green-600',
  declined: 'bg-muted text-muted-foreground',
}

export async function MyFeedbackList() {
  const session = await requireSession()
  const admin = createAdminClient()

  const { data: tickets } = await admin
    .from('feedback_tickets')
    .select('id, type, title, description, status, priority, created_at')
    .eq('created_by', session.userId)
    .order('created_at', { ascending: false })

  const ticketIds = (tickets ?? []).map((t) => t.id)
  const { data: comments } = ticketIds.length
    ? await admin
        .from('feedback_comments')
        .select('id, ticket_id, body, is_internal, created_at, author_id')
        .in('ticket_id', ticketIds)
        .eq('is_internal', false)
        .order('created_at')
    : { data: [] }

  const authorIds = Array.from(
    new Set((comments ?? []).map((c) => c.author_id).filter((x): x is string => !!x)),
  )
  const { data: authors } = authorIds.length
    ? await admin.from('user_profiles').select('id, full_name').in('id', authorIds)
    : { data: [] }
  const authorById = new Map((authors ?? []).map((a) => [a.id, a]))

  const commentsByTicket = new Map<string, Array<{ author: string | null; body: string; created_at: string }>>()
  for (const c of comments ?? []) {
    const list = commentsByTicket.get(c.ticket_id) ?? []
    list.push({
      author: c.author_id ? authorById.get(c.author_id)?.full_name ?? null : null,
      body: c.body,
      created_at: c.created_at,
    })
    commentsByTicket.set(c.ticket_id, list)
  }

  return (
    <div className="space-y-4">
      {(tickets ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No has reportado ningun ticket. Usa el boton "Feedback" para crear uno.
        </p>
      ) : (
        (tickets ?? []).map((t) => {
          const Icon = TYPE_ICON[t.type as keyof typeof TYPE_ICON] ?? Bug
          const ticketComments = commentsByTicket.get(t.id) ?? []
          return (
            <Card key={t.id} className="glass-subtle">
              <CardContent className="space-y-3 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <Icon className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLOR[t.status] ?? ''}`}>
                          {t.status}
                        </span>
                        <p className="font-medium">{t.title}</p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        <FormattedTime value={t.created_at} variant="relative" />
                      </p>
                    </div>
                  </div>
                </div>

                {ticketComments.length > 0 && (
                  <div className="space-y-2 border-l-2 border-primary/30 pl-3 ml-8">
                    {ticketComments.map((c, idx) => (
                      <div key={idx} className="text-sm">
                        <p className="text-xs font-medium text-foreground">
                          {c.author ?? 'Equipo'}
                          <span className="ml-2 text-muted-foreground font-normal">
                            <FormattedTime value={c.created_at} variant="relative" />
                          </span>
                        </p>
                        <p className="text-muted-foreground whitespace-pre-wrap">{c.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
