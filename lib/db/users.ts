import { createAdminClient } from '@/lib/supabase/admin'

export type UserProfileSummary = {
  id: string
  full_name: string
  document_type: string | null
  document_number: string | null
  phone: string | null
  phone_type: string | null
  avatar_url: string | null
  created_at: string
  joined_at: string
  roles: string[]
}

export async function getUserProfile(
  tenantId: string,
  userId: string,
): Promise<UserProfileSummary | null> {
  const admin = createAdminClient()

  const { data: membership } = await admin
    .from('user_tenant_memberships')
    .select('joined_at, active')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!membership || !membership.active) return null

  const { data: profile } = await admin
    .from('user_profiles')
    .select(
      'id, full_name, document_type, document_number, phone, phone_type, avatar_url, created_at',
    )
    .eq('id', userId)
    .maybeSingle()

  if (!profile) return null

  const { data: userRoles } = await admin
    .from('user_roles')
    .select('roles(code, name)')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .is('revoked_at', null)

  const roles = (userRoles ?? [])
    .map((r) => (r.roles as unknown as { name: string } | null)?.name)
    .filter((n): n is string => Boolean(n))

  return {
    id: profile.id,
    full_name: profile.full_name,
    document_type: profile.document_type,
    document_number: profile.document_number,
    phone: profile.phone,
    phone_type: profile.phone_type,
    avatar_url: profile.avatar_url,
    created_at: profile.created_at,
    joined_at: membership.joined_at,
    roles,
  }
}

export type UserGroup = {
  membership_id: string
  group_id: string
  group_name: string
  group_status: string
  intake_year: number
  current_cycle: number
  joined_at: string
  left_at: string | null
  program_id: string | null
  program_name: string | null
  program_code: string | null
}

export async function getUserGroups(
  tenantId: string,
  userId: string,
): Promise<UserGroup[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('group_members')
    .select(
      `id, joined_at, left_at,
       student_groups!inner(
         id, name, status, intake_year, current_cycle, program_id,
         academic_programs(id, name, code)
       )`,
    )
    .eq('tenant_id', tenantId)
    .eq('student_id', userId)
    .order('joined_at', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const g = row.student_groups as unknown as {
      id: string
      name: string
      status: string
      intake_year: number
      current_cycle: number
      program_id: string
      academic_programs: { id: string; name: string; code: string } | null
    }
    return {
      membership_id: row.id,
      group_id: g.id,
      group_name: g.name,
      group_status: g.status,
      intake_year: g.intake_year,
      current_cycle: g.current_cycle,
      joined_at: row.joined_at,
      left_at: row.left_at,
      program_id: g.program_id,
      program_name: g.academic_programs?.name ?? null,
      program_code: g.academic_programs?.code ?? null,
    }
  })
}

export type UserEnrollment = {
  id: string
  status: string
  enrolled_at: string
  final_grade: number | null
  final_letter: string | null
  course_id: string
  section_code: string | null
  subject_id: string | null
  subject_name: string | null
  subject_code: string | null
  period_id: string | null
  period_name: string | null
  period_code: string | null
}

export async function getUserEnrollments(
  tenantId: string,
  userId: string,
): Promise<UserEnrollment[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('enrollments')
    .select(
      `id, status, enrolled_at, final_grade, final_letter,
       courses(
         id, section_code,
         subjects(id, name, code),
         academic_periods(id, name, code)
       )`,
    )
    .eq('tenant_id', tenantId)
    .eq('student_id', userId)
    .is('deleted_at', null)
    .order('enrolled_at', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const c = row.courses as unknown as {
      id: string
      section_code: string | null
      subjects: { id: string; name: string; code: string } | null
      academic_periods: { id: string; name: string; code: string } | null
    } | null
    return {
      id: row.id,
      status: row.status,
      enrolled_at: row.enrolled_at,
      final_grade: row.final_grade,
      final_letter: row.final_letter,
      course_id: c?.id ?? '',
      section_code: c?.section_code ?? null,
      subject_id: c?.subjects?.id ?? null,
      subject_name: c?.subjects?.name ?? null,
      subject_code: c?.subjects?.code ?? null,
      period_id: c?.academic_periods?.id ?? null,
      period_name: c?.academic_periods?.name ?? null,
      period_code: c?.academic_periods?.code ?? null,
    }
  })
}

export type UserCharge = {
  id: string
  amount: number
  status: string
  due_date: string
  concept_id: string
  concept_name: string | null
}

export async function getUserCharges(
  tenantId: string,
  userId: string,
): Promise<UserCharge[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('student_charges')
    .select(
      `id, amount, status, due_date, concept_id,
       payment_concepts(id, name)`,
    )
    .eq('tenant_id', tenantId)
    .eq('student_id', userId)
    .is('deleted_at', null)
    .order('due_date', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const c = row.payment_concepts as unknown as {
      id: string
      name: string
    } | null
    return {
      id: row.id,
      amount: Number(row.amount),
      status: row.status,
      due_date: row.due_date,
      concept_id: row.concept_id,
      concept_name: c?.name ?? null,
    }
  })
}

export type UserPayment = {
  id: string
  amount: number
  method: string
  paid_on: string
  status: string
  reference: string | null
}

export async function getUserPayments(
  tenantId: string,
  userId: string,
): Promise<UserPayment[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('payments')
    .select('id, amount, method, paid_on, status, reference')
    .eq('tenant_id', tenantId)
    .eq('student_id', userId)
    .is('deleted_at', null)
    .order('paid_on', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    amount: Number(row.amount),
    method: row.method,
    paid_on: row.paid_on,
    status: row.status,
    reference: row.reference,
  }))
}

export type UserAccountStatement = {
  total_charged: number
  total_paid: number
  balance_due: number
  next_due_date: string | null
  overdue_count: number
}

export async function getUserAccountStatement(
  tenantId: string,
  userId: string,
): Promise<UserAccountStatement | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('v_student_account_statement')
    .select(
      'total_charged, total_paid, balance_due, next_due_date, overdue_count',
    )
    .eq('tenant_id', tenantId)
    .eq('student_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null

  return {
    total_charged: Number(data.total_charged ?? 0),
    total_paid: Number(data.total_paid ?? 0),
    balance_due: Number(data.balance_due ?? 0),
    next_due_date: data.next_due_date,
    overdue_count: Number(data.overdue_count ?? 0),
  }
}
