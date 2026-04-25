'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { logActivity } from '@/lib/audit/activity'
import { recordPaymentSchema, voidPaymentSchema } from '@/lib/validators/payments'
import { suggestAllocation } from '@/lib/payments/allocate'
import { getPendingChargesForAllocation } from '@/lib/db/payments'

export async function recordPaymentAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('payments:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const parsed = recordPaymentSchema.safeParse({
    studentId: formData.get('studentId') as string,
    amount: Number(formData.get('amount')),
    method: formData.get('method') as string,
    paidOn: formData.get('paidOn') as string,
    reference: (formData.get('reference') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
    externalTransactionId: (formData.get('externalTransactionId') as string) || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { studentId, amount, method, paidOn, reference, notes, externalTransactionId } = parsed.data

  // Insert payment
  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .insert({
      tenant_id: session.activeTenantId,
      student_id: studentId,
      amount,
      method,
      paid_on: paidOn,
      reference: reference ?? null,
      notes: notes ?? null,
      external_transaction_id: externalTransactionId ?? null,
      recorded_by: session.userId,
      status: 'confirmed',
    })
    .select('id')
    .single()

  if (paymentError || !payment) {
    return { error: 'Error al registrar el pago' }
  }

  // Auto-allocate using FIFO
  const rawCharges = await getPendingChargesForAllocation(session.activeTenantId, studentId)

  // We need amount_paid per charge — fetch allocations
  const chargesWithBalance = await Promise.all(
    rawCharges.map(async (charge) => {
      const { data: allocs } = await admin
        .from('payment_allocations')
        .select('amount_applied')
        .eq('charge_id', charge.id)

      const amountPaid = (allocs ?? []).reduce((sum, a) => sum + a.amount_applied, 0)
      return {
        id: charge.id,
        amount: charge.amount,
        amountPaid,
        dueDate: charge.due_date,
      }
    }),
  )

  const suggestions = suggestAllocation(amount, chargesWithBalance)

  if (suggestions.length > 0) {
    await admin.from('payment_allocations').insert(
      suggestions.map((s) => ({
        payment_id: payment.id,
        charge_id: s.chargeId,
        amount_applied: s.amountApplied,
      })),
    )

    // Update charge statuses
    for (const s of suggestions) {
      const charge = chargesWithBalance.find((c) => c.id === s.chargeId)
      if (!charge) continue
      const totalPaid = charge.amountPaid + s.amountApplied
      const newStatus = totalPaid >= charge.amount ? 'paid' : 'partial'
      await admin
        .from('student_charges')
        .update({ status: newStatus, updated_by: session.userId })
        .eq('id', s.chargeId)
    }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'payment.recorded',
    resourceType: 'payment',
    resourceId: payment.id,
    summary: `Pago de $${amount} registrado para estudiante ${studentId}`,
    metadata: { studentId, amount, method },
  })

  return { success: true, id: payment.id }
}

export async function voidPaymentAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('payments:void')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const parsed = voidPaymentSchema.safeParse({
    paymentId: formData.get('paymentId') as string,
    reason: formData.get('reason') as string,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { paymentId, reason } = parsed.data

  // Verify payment belongs to tenant
  const { data: existingPayment } = await admin
    .from('payments')
    .select('id, student_id, amount')
    .eq('id', paymentId)
    .eq('tenant_id', session.activeTenantId)
    .is('deleted_at', null)
    .single()

  if (!existingPayment) {
    return { error: 'Pago no encontrado' }
  }

  // Soft-delete the payment
  const { error } = await admin
    .from('payments')
    .update({
      status: 'voided',
      deleted_at: new Date().toISOString(),
      notes: reason,
    })
    .eq('id', paymentId)
    .eq('tenant_id', session.activeTenantId)

  if (error) {
    return { error: 'Error al anular el pago' }
  }

  // Reverse allocations: revert charge statuses
  const { data: allocations } = await admin
    .from('payment_allocations')
    .select('charge_id, amount_applied')
    .eq('payment_id', paymentId)

  for (const alloc of allocations ?? []) {
    const { data: charge } = await admin
      .from('student_charges')
      .select('amount')
      .eq('id', alloc.charge_id)
      .single()

    if (!charge) continue

    // Get remaining paid after voiding
    const { data: otherAllocs } = await admin
      .from('payment_allocations')
      .select('amount_applied')
      .eq('charge_id', alloc.charge_id)
      .neq('payment_id', paymentId)

    const remainingPaid = (otherAllocs ?? []).reduce((sum, a) => sum + a.amount_applied, 0)
    const newStatus = remainingPaid <= 0 ? 'pending' : remainingPaid >= charge.amount ? 'paid' : 'partial'

    await admin
      .from('student_charges')
      .update({ status: newStatus })
      .eq('id', alloc.charge_id)
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'payment.voided',
    resourceType: 'payment',
    resourceId: paymentId,
    summary: `Pago ${paymentId} anulado: ${reason}`,
    metadata: { reason },
  })

  return { success: true }
}
