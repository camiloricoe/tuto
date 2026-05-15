import { z } from 'zod/v4'

export const FEEDBACK_TYPES = ['bug', 'suggestion', 'question'] as const
export const FEEDBACK_STATUSES = ['open', 'triaged', 'in_progress', 'resolved', 'declined'] as const
export const FEEDBACK_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const

export const createFeedbackSchema = z.object({
  type: z.enum(FEEDBACK_TYPES),
  title: z.string().min(3, 'Titulo muy corto').max(200),
  description: z.string().min(5, 'Descripcion muy corta').max(5000),
  targetUrl: z.string().max(500).optional(),
  targetSelector: z.string().max(500).optional(),
  targetText: z.string().max(500).optional(),
  viewportWidth: z.number().int().optional(),
  viewportHeight: z.number().int().optional(),
  userAgent: z.string().max(500).optional(),
})

export const updateFeedbackStatusSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(FEEDBACK_STATUSES).optional(),
  priority: z.enum(FEEDBACK_PRIORITIES).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
})

export const addCommentSchema = z.object({
  ticketId: z.string().uuid(),
  body: z.string().min(1).max(5000),
  isInternal: z.boolean().optional(),
})

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number]
export type FeedbackType = (typeof FEEDBACK_TYPES)[number]
export type FeedbackPriority = (typeof FEEDBACK_PRIORITIES)[number]
