'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { logActivity } from '@/lib/audit/activity'
import { createPaymentConceptSchema, updatePaymentConceptSchema } from '@/lib/validators/payments'

export async function createPaymentConceptAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('payments:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const parsed = createPaymentConceptSchema.safeParse({
    name: formData.get('name') as string,
    code: formData.get('code') as string,
    defaultAmount: formData.get('defaultAmount') ? Number(formData.get('defaultAmount')) : undefined,
    recurring: formData.get('recurring') === 'true',
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { name, code, defaultAmount, recurring } = parsed.data

  // Check code uniqueness
  const { data: existing } = await admin
    .from('payment_concepts')
    .select('id')
    .eq('tenant_id', session.activeTenantId)
    .eq('code', code)
    .is('deleted_at', null)
    .single()

  if (existing) {
    return { error: `El codigo ${code} ya esta en uso` }
  }

  const { data, error } = await admin
    .from('payment_concepts')
    .insert({
      tenant_id: session.activeTenantId,
      name,
      code,
      default_amount: defaultAmount ?? null,
      recurring: recurring ?? false,
      created_by: session.userId,
    })
    .select('id')
    .single()

  if (error) {
    return { error: 'Error al crear el concepto de pago' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'payment_concept.created',
    resourceType: 'payment_concept',
    resourceId: data.id,
    summary: `Concepto ${name} (${code}) creado`,
    metadata: { name, code },
  })

  return { success: true, id: data.id }
}

export async function updatePaymentConceptAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('payments:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const conceptId = formData.get('conceptId') as string
  if (!conceptId) return { error: 'ID de concepto requerido' }

  const parsed = updatePaymentConceptSchema.safeParse({
    name: (formData.get('name') as string) || undefined,
    defaultAmount: formData.get('defaultAmount') ? Number(formData.get('defaultAmount')) : undefined,
    recurring: formData.get('recurring') !== null ? formData.get('recurring') === 'true' : undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { name, defaultAmount, recurring } = parsed.data

  const { error } = await admin
    .from('payment_concepts')
    .update({
      ...(name && { name }),
      ...(defaultAmount !== undefined && { default_amount: defaultAmount }),
      ...(recurring !== undefined && { recurring }),
    })
    .eq('id', conceptId)
    .eq('tenant_id', session.activeTenantId)

  if (error) {
    return { error: 'Error al actualizar el concepto' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'payment_concept.updated',
    resourceType: 'payment_concept',
    resourceId: conceptId,
    summary: `Concepto ${conceptId} actualizado`,
    metadata: {},
  })

  return { success: true }
}

export async function deletePaymentConceptAction(conceptId: string) {
  const session = await requireSession()
  await requirePermission('payments:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('payment_concepts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', conceptId)
    .eq('tenant_id', session.activeTenantId)

  if (error) {
    return { error: 'Error al eliminar el concepto' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'payment_concept.deleted',
    resourceType: 'payment_concept',
    resourceId: conceptId,
    summary: `Concepto ${conceptId} eliminado`,
    metadata: {},
  })

  return { success: true }
}
