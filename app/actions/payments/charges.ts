'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { logActivity } from '@/lib/audit/activity'
import { createChargeSchema } from '@/lib/validators/payments'

export async function createChargeAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('payments:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const parsed = createChargeSchema.safeParse({
    studentId: formData.get('studentId') as string,
    conceptId: formData.get('conceptId') as string,
    amount: Number(formData.get('amount')),
    dueDate: formData.get('dueDate') as string,
    periodId: (formData.get('periodId') as string) || undefined,
    programId: (formData.get('programId') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { studentId, conceptId, amount, dueDate, periodId, programId, notes } = parsed.data

  const { data, error } = await admin
    .from('student_charges')
    .insert({
      tenant_id: session.activeTenantId,
      student_id: studentId,
      concept_id: conceptId,
      amount,
      due_date: dueDate,
      period_id: periodId ?? null,
      program_id: programId ?? null,
      notes: notes ?? null,
      created_by: session.userId,
    })
    .select('id')
    .single()

  if (error) {
    return { error: 'Error al crear el cargo' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'student_charge.created',
    resourceType: 'student_charge',
    resourceId: data.id,
    summary: `Cargo de $${amount} creado para estudiante ${studentId}`,
    metadata: { studentId, amount, dueDate },
  })

  return { success: true, id: data.id }
}

export async function deleteChargeAction(chargeId: string) {
  const session = await requireSession()
  await requirePermission('payments:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('student_charges')
    .update({ deleted_at: new Date().toISOString(), updated_by: session.userId })
    .eq('id', chargeId)
    .eq('tenant_id', session.activeTenantId)

  if (error) {
    return { error: 'Error al eliminar el cargo' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'student_charge.deleted',
    resourceType: 'student_charge',
    resourceId: chargeId,
    summary: `Cargo ${chargeId} eliminado`,
    metadata: {},
  })

  return { success: true }
}
