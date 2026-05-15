import { describe, it, expect } from 'vitest'
import {
  createFeedbackSchema,
  updateFeedbackStatusSchema,
  addCommentSchema,
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
  FEEDBACK_PRIORITIES,
} from '@/lib/validators/feedback'

describe('createFeedbackSchema', () => {
  it('accepts minimal valid input', () => {
    const r = createFeedbackSchema.safeParse({
      type: 'bug',
      title: 'X falla',
      description: 'detalle del bug',
    })
    expect(r.success).toBe(true)
  })

  it('rejects unknown type', () => {
    const r = createFeedbackSchema.safeParse({
      type: 'crash',
      title: 'titulo',
      description: 'desc valida',
    })
    expect(r.success).toBe(false)
  })

  it('rejects too short title', () => {
    const r = createFeedbackSchema.safeParse({
      type: 'bug',
      title: 'ab',
      description: 'descripcion',
    })
    expect(r.success).toBe(false)
  })

  it('caps title at 200', () => {
    const r = createFeedbackSchema.safeParse({
      type: 'bug',
      title: 'a'.repeat(201),
      description: 'descripcion',
    })
    expect(r.success).toBe(false)
  })

  it('caps description at 5000', () => {
    const r = createFeedbackSchema.safeParse({
      type: 'bug',
      title: 'titulo',
      description: 'a'.repeat(5001),
    })
    expect(r.success).toBe(false)
  })

  it('accepts optional capture fields', () => {
    const r = createFeedbackSchema.safeParse({
      type: 'suggestion',
      title: 'mejora',
      description: 'descripcion valida',
      targetUrl: 'https://app.tuto/x',
      targetSelector: 'button.primary',
      targetText: 'Comprar',
      viewportWidth: 1920,
      viewportHeight: 1080,
      userAgent: 'Mozilla/5.0',
    })
    expect(r.success).toBe(true)
  })
})

describe('updateFeedbackStatusSchema', () => {
  it('requires uuid', () => {
    const r = updateFeedbackStatusSchema.safeParse({
      ticketId: 'not-uuid',
      status: 'open',
    })
    expect(r.success).toBe(false)
  })

  it('all status values are accepted by validator', () => {
    for (const s of FEEDBACK_STATUSES) {
      const r = updateFeedbackStatusSchema.safeParse({
        ticketId: '550e8400-e29b-41d4-a716-446655440000',
        status: s,
      })
      expect(r.success).toBe(true)
    }
  })

  it('all priority values accepted', () => {
    for (const p of FEEDBACK_PRIORITIES) {
      const r = updateFeedbackStatusSchema.safeParse({
        ticketId: '550e8400-e29b-41d4-a716-446655440000',
        priority: p,
      })
      expect(r.success).toBe(true)
    }
  })

  it('assignedTo can be null (unassign)', () => {
    const r = updateFeedbackStatusSchema.safeParse({
      ticketId: '550e8400-e29b-41d4-a716-446655440000',
      assignedTo: null,
    })
    expect(r.success).toBe(true)
  })
})

describe('addCommentSchema', () => {
  it('requires non-empty body', () => {
    const r = addCommentSchema.safeParse({
      ticketId: '550e8400-e29b-41d4-a716-446655440000',
      body: '',
    })
    expect(r.success).toBe(false)
  })

  it('caps body at 5000', () => {
    const r = addCommentSchema.safeParse({
      ticketId: '550e8400-e29b-41d4-a716-446655440000',
      body: 'x'.repeat(5001),
    })
    expect(r.success).toBe(false)
  })
})

describe('catalog constants stay in sync with DB checks', () => {
  it('FEEDBACK_TYPES matches schema enum', () => {
    expect(FEEDBACK_TYPES).toEqual(['bug', 'suggestion', 'question'])
  })
  it('FEEDBACK_STATUSES matches schema enum', () => {
    expect(FEEDBACK_STATUSES).toEqual(['open', 'triaged', 'in_progress', 'resolved', 'declined'])
  })
  it('FEEDBACK_PRIORITIES matches schema enum', () => {
    expect(FEEDBACK_PRIORITIES).toEqual(['low', 'medium', 'high', 'critical'])
  })
})
