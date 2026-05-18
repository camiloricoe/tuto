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

// Status flow: open → triaged → in_progress → resolved. declined is terminal.
const NEXT_STATUS: Record<string, string> = {
  open: 'triaged',
  triaged: 'in_progress',
  in_progress: 'resolved',
}

export async function advanceFeedbackStatusAction(
  _prev: unknown,
  formData: FormData,
) {
  const session = await requireSession()
  await requirePermission('feedback:manage')

  const ticketId = (formData.get('ticketId') as string | null)?.trim() ?? ''
  if (!ticketId) return { error: 'ticketId requerido' }

  const admin = createAdminClient()
  const { data: row } = await admin
    .from('feedback_tickets')
    .select('id, status, tenant_id')
    .eq('id', ticketId)
    .maybeSingle()
  if (!row) return { error: 'Ticket no encontrado' }

  const next = NEXT_STATUS[row.status]
  if (!next) return { error: 'No hay siguiente estado para "' + row.status + '"' }

  const update: { status: string; resolved_at?: string | null } = { status: next }
  if (next === 'resolved') update.resolved_at = new Date().toISOString()

  const { error } = await admin
    .from('feedback_tickets')
    .update(update)
    .eq('id', ticketId)
  if (error) return { error: 'No se pudo avanzar el ticket' }

  await logActivity({
    tenantId: row.tenant_id ?? session.activeTenantId ?? '00000000-0000-0000-0000-000000000000',
    actorUserId: session.userId,
    actionCode: 'feedback.status_advanced',
    resourceType: 'feedback',
    resourceId: ticketId,
    summary: `Ticket ${row.status} → ${next}`,
    metadata: { from: row.status, to: next },
  })

  revalidatePath(`/a/feedback/${ticketId}`)
  revalidatePath('/a/feedback')
  return { success: true }
}

export async function bulkAdvanceFeedbackStatusAction(
  _prev: unknown,
  formData: FormData,
) {
  const session = await requireSession()
  await requirePermission('feedback:manage')

  const fromStatus = (formData.get('fromStatus') as string | null)?.trim() ?? ''
  if (!NEXT_STATUS[fromStatus]) {
    return { error: 'Estado origen invalido' }
  }
  const toStatus = NEXT_STATUS[fromStatus]

  const admin = createAdminClient()

  // Scope: super_admin sees all tenants; tenant admin only their own
  let q = admin
    .from('feedback_tickets')
    .select('id, tenant_id')
    .eq('status', fromStatus)
  if (!session.isSuperAdmin && session.activeTenantId) {
    q = q.eq('tenant_id', session.activeTenantId)
  }

  const { data: rows } = await q
  if (!rows || rows.length === 0) {
    return { success: true, count: 0 }
  }

  const ids = rows.map((r) => r.id)
  const update: { status: string; resolved_at?: string | null } = { status: toStatus }
  if (toStatus === 'resolved') update.resolved_at = new Date().toISOString()

  const { error } = await admin
    .from('feedback_tickets')
    .update(update)
    .in('id', ids)
  if (error) return { error: 'No se pudo actualizar en bloque' }

  await logActivity({
    tenantId: session.activeTenantId ?? '00000000-0000-0000-0000-000000000000',
    actorUserId: session.userId,
    actionCode: 'feedback.bulk_advanced',
    resourceType: 'feedback',
    resourceId: 'bulk',
    summary: `${rows.length} ticket(s) ${fromStatus} → ${toStatus}`,
    metadata: { from: fromStatus, to: toStatus, count: rows.length },
  })

  revalidatePath('/a/feedback')
  return { success: true, count: rows.length }
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
