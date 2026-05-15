'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { logActivity } from '@/lib/audit/activity'
import {
  createFeedbackSchema,
  updateFeedbackStatusSchema,
  addCommentSchema,
} from '@/lib/validators/feedback'

export async function createFeedbackAction(payload: unknown) {
  const session = await requireSession()
  const parsed = createFeedbackSchema.safeParse(payload)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('feedback_tickets')
    .insert({
      tenant_id: session.activeTenantId,
      created_by: session.userId,
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description,
      target_url: parsed.data.targetUrl ?? null,
      target_selector: parsed.data.targetSelector ?? null,
      target_text: parsed.data.targetText ?? null,
      viewport_width: parsed.data.viewportWidth ?? null,
      viewport_height: parsed.data.viewportHeight ?? null,
      user_role: session.roles[0] ?? null,
      user_agent: parsed.data.userAgent ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: 'No se pudo crear el ticket' }
  }

  await logActivity({
    tenantId: session.activeTenantId ?? '00000000-0000-0000-0000-000000000000',
    actorUserId: session.userId,
    actionCode: 'feedback.created',
    resourceType: 'feedback',
    resourceId: data.id,
    summary: `${parsed.data.type === 'bug' ? 'Bug' : parsed.data.type === 'suggestion' ? 'Sugerencia' : 'Pregunta'}: ${parsed.data.title}`,
    metadata: { type: parsed.data.type, url: parsed.data.targetUrl ?? '' },
  })

  revalidatePath('/a/feedback')
  return { success: true, id: data.id }
}

export async function updateFeedbackStatusAction(_prev: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('feedback:manage')

  const parsed = updateFeedbackStatusSchema.safeParse({
    ticketId: formData.get('ticketId'),
    status: (formData.get('status') as string) || undefined,
    priority: (formData.get('priority') as string) || undefined,
    assignedTo: (formData.get('assignedTo') as string) || undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const update: {
    status?: string
    resolved_at?: string | null
    priority?: string
    assigned_to?: string | null
  } = {}
  if (parsed.data.status) {
    update.status = parsed.data.status
    if (parsed.data.status === 'resolved' || parsed.data.status === 'declined') {
      update.resolved_at = new Date().toISOString()
    }
  }
  if (parsed.data.priority) update.priority = parsed.data.priority
  if (parsed.data.assignedTo !== undefined) update.assigned_to = parsed.data.assignedTo || null

  const { error } = await admin
    .from('feedback_tickets')
    .update(update)
    .eq('id', parsed.data.ticketId)

  if (error) return { error: 'No se pudo actualizar el ticket' }

  await logActivity({
    tenantId: session.activeTenantId ?? '00000000-0000-0000-0000-000000000000',
    actorUserId: session.userId,
    actionCode: 'feedback.updated',
    resourceType: 'feedback',
    resourceId: parsed.data.ticketId,
    summary: `Ticket actualizado (${Object.keys(update).join(', ')})`,
    metadata: update as Record<string, string | number | boolean | null>,
  })

  revalidatePath(`/a/feedback/${parsed.data.ticketId}`)
  revalidatePath('/a/feedback')
  return { success: true }
}

export async function addFeedbackCommentAction(_prev: unknown, formData: FormData) {
  const session = await requireSession()

  const parsed = addCommentSchema.safeParse({
    ticketId: formData.get('ticketId'),
    body: formData.get('body'),
    isInternal: formData.get('isInternal') === 'true',
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { data: ticket } = await admin
    .from('feedback_tickets')
    .select('id, created_by, tenant_id')
    .eq('id', parsed.data.ticketId)
    .single()

  if (!ticket) return { error: 'Ticket no encontrado' }

  const isOwner = ticket.created_by === session.userId
  const canManage = session.permissions.has('feedback:manage')
  if (!isOwner && !canManage) return { error: 'Sin permisos' }
  if (parsed.data.isInternal && !canManage) return { error: 'Solo staff puede comentar internamente' }

  const { error } = await admin.from('feedback_comments').insert({
    ticket_id: parsed.data.ticketId,
    author_id: session.userId,
    body: parsed.data.body,
    is_internal: parsed.data.isInternal === true && canManage,
  })

  if (error) return { error: 'No se pudo agregar el comentario' }

  await admin
    .from('feedback_tickets')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', parsed.data.ticketId)

  await logActivity({
    tenantId: ticket.tenant_id ?? '00000000-0000-0000-0000-000000000000',
    actorUserId: session.userId,
    actionCode: 'feedback.commented',
    resourceType: 'feedback',
    resourceId: parsed.data.ticketId,
    summary: `Comentario en ticket${parsed.data.isInternal && canManage ? ' (interno)' : ''}`,
    metadata: { internal: parsed.data.isInternal === true && canManage },
  })

  revalidatePath(`/a/feedback/${parsed.data.ticketId}`)
  revalidatePath('/s/feedback')
  revalidatePath('/t/feedback')
  return { success: true }
}
