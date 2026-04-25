import { createAdminClient } from '@/lib/supabase/admin'

export async function getPaymentConcepts(tenantId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('payment_concepts')
    .select('id, name, code, default_amount, recurring, created_at')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('name')
  if (error) throw new Error(error.message)
  return data
}

export async function getPayments(tenantId: string, limit = 50) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('payments')
    .select(
      `id, amount, currency, method, paid_on, status, reference, notes, recorded_at,
       user_profiles!payments_student_id_fkey(id, full_name)`,
    )
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('recorded_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return data
}

export async function getStudentCharges(tenantId: string, studentId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('student_charges')
    .select(
      `id, amount, status, due_date, notes, created_at,
       payment_concepts(id, name, code)`,
    )
    .eq('tenant_id', tenantId)
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .order('due_date')
  if (error) throw new Error(error.message)
  return data
}

export async function getStudentPayments(tenantId: string, studentId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('payments')
    .select('id, amount, currency, method, paid_on, status, reference, notes, recorded_at')
    .eq('tenant_id', tenantId)
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .order('paid_on', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function getStudentAccountStatement(tenantId: string, studentId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('v_student_account_statement')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('student_id', studentId)
    .single()
  if (error && error.code !== 'PGRST116') throw new Error(error.message)
  return data
}

export async function getPendingChargesForAllocation(tenantId: string, studentId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('student_charges')
    .select('id, amount, due_date')
    .eq('tenant_id', tenantId)
    .eq('student_id', studentId)
    .in('status', ['pending', 'partial'])
    .is('deleted_at', null)
    .order('due_date')
  if (error) throw new Error(error.message)
  return data
}

export async function getPaymentAllocations(paymentId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('payment_allocations')
    .select('id, amount_applied, charge_id')
    .eq('payment_id', paymentId)
  if (error) throw new Error(error.message)
  return data
}
