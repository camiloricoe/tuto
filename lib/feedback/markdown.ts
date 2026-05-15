type TicketLike = {
  id: string
  type: string
  title: string
  description: string
  status: string
  priority: string
  target_url: string | null
  target_selector: string | null
  target_text: string | null
  viewport_width: number | null
  viewport_height: number | null
  user_role: string | null
  user_agent: string | null
  created_at: string
  reporter_name?: string | null
  tenant_name?: string | null
  comments?: Array<{ author_name: string | null; body: string; is_internal: boolean; created_at: string }>
}

export function ticketToMarkdown(t: TicketLike): string {
  const lines: string[] = []
  lines.push(`## ${t.type.toUpperCase()}: ${t.title}`)
  lines.push('')
  lines.push(`- **Ticket ID:** \`${t.id}\``)
  lines.push(`- **Status:** ${t.status} · **Priority:** ${t.priority}`)
  if (t.reporter_name) lines.push(`- **Reporter:** ${t.reporter_name}${t.user_role ? ` (${t.user_role})` : ''}`)
  if (t.tenant_name) lines.push(`- **Tenant:** ${t.tenant_name}`)
  lines.push(`- **Created:** ${t.created_at}`)
  if (t.target_url) lines.push(`- **URL:** ${t.target_url}`)
  if (t.target_selector) lines.push(`- **Selector:** \`${t.target_selector}\``)
  if (t.target_text) lines.push(`- **Element text:** "${t.target_text}"`)
  if (t.viewport_width && t.viewport_height) {
    lines.push(`- **Viewport:** ${t.viewport_width}x${t.viewport_height}`)
  }
  if (t.user_agent) lines.push(`- **User agent:** ${t.user_agent}`)
  lines.push('')
  lines.push('### Description')
  lines.push(t.description)
  if (t.comments && t.comments.length > 0) {
    lines.push('')
    lines.push('### Comments')
    for (const c of t.comments) {
      lines.push(
        `- **${c.author_name ?? 'Usuario'}** · ${c.created_at}${c.is_internal ? ' · _internal_' : ''}`,
      )
      lines.push(`  > ${c.body.replace(/\n/g, '\n  > ')}`)
    }
  }
  return lines.join('\n')
}

export function ticketsToMarkdown(tickets: TicketLike[]): string {
  if (tickets.length === 0) return '_No tickets._'
  return tickets.map(ticketToMarkdown).join('\n\n---\n\n')
}
