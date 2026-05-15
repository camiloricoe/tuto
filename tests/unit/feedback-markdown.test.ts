import { describe, it, expect } from 'vitest'
import { ticketToMarkdown, ticketsToMarkdown } from '@/lib/feedback/markdown'

const baseTicket = {
  id: '00000000-0000-0000-0000-000000000001',
  type: 'bug',
  title: 'Botón rompe',
  description: 'Al hacer click no pasa nada',
  status: 'open',
  priority: 'high',
  target_url: 'https://app/x',
  target_selector: 'button.primary',
  target_text: 'Comprar',
  viewport_width: 1920,
  viewport_height: 1080,
  user_role: 'admin',
  user_agent: 'Mozilla/5.0',
  created_at: '2026-05-14T10:00:00Z',
}

describe('ticketToMarkdown', () => {
  it('includes title, status, description', () => {
    const md = ticketToMarkdown(baseTicket)
    expect(md).toContain('## BUG: Botón rompe')
    expect(md).toContain('Status:** open')
    expect(md).toContain('Priority:** high')
    expect(md).toContain('### Description')
    expect(md).toContain('Al hacer click no pasa nada')
  })

  it('includes URL, selector, viewport, user agent', () => {
    const md = ticketToMarkdown(baseTicket)
    expect(md).toContain('https://app/x')
    expect(md).toContain('`button.primary`')
    expect(md).toContain('"Comprar"')
    expect(md).toContain('1920x1080')
    expect(md).toContain('Mozilla/5.0')
  })

  it('omits optional fields when null', () => {
    const md = ticketToMarkdown({
      ...baseTicket,
      target_url: null,
      target_selector: null,
      target_text: null,
      viewport_width: null,
      viewport_height: null,
      user_agent: null,
    })
    expect(md).not.toContain('URL:')
    expect(md).not.toContain('Selector:')
    expect(md).not.toContain('Element text:')
    expect(md).not.toContain('Viewport:')
    expect(md).not.toContain('User agent:')
  })

  it('renders comments section when provided', () => {
    const md = ticketToMarkdown({
      ...baseTicket,
      comments: [
        { author_name: 'Camilo', body: 'Lo revisamos', is_internal: false, created_at: '2026-05-14T11:00:00Z' },
        { author_name: 'Camilo', body: 'Nota interna', is_internal: true, created_at: '2026-05-14T12:00:00Z' },
      ],
    })
    expect(md).toContain('### Comments')
    expect(md).toContain('Lo revisamos')
    expect(md).toContain('Nota interna')
    expect(md).toContain('_internal_')
  })

  it('renders reporter and tenant when provided', () => {
    const md = ticketToMarkdown({
      ...baseTicket,
      reporter_name: 'Camilo Rico',
      tenant_name: 'INDECAP',
    })
    expect(md).toContain('Camilo Rico')
    expect(md).toContain('admin')
    expect(md).toContain('INDECAP')
  })
})

describe('ticketsToMarkdown', () => {
  it('separates multiple tickets with horizontal rules', () => {
    const md = ticketsToMarkdown([baseTicket, { ...baseTicket, id: '2', title: 'Otro' }])
    expect((md.match(/---/g) ?? []).length).toBeGreaterThanOrEqual(1)
    expect(md).toContain('Botón rompe')
    expect(md).toContain('Otro')
  })

  it('returns no-tickets string when empty', () => {
    expect(ticketsToMarkdown([])).toContain('No tickets')
  })
})
