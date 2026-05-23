import { createAdminClient } from '@/lib/supabase/admin'

export async function getGroups(tenantId: string, programId?: string) {
  const admin = createAdminClient()
  let query = admin
    .from('student_groups')
    .select(
      `id, name, code, intake_year, intake_period, status, current_cycle,
       curriculum_id, snapshotted_at, notes, created_at, program_id,
       academic_programs(id, name, code)`,
    )
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
  if (programId) query = query.eq('program_id', programId)
  const { data, error } = await query
    .order('intake_year', { ascending: false })
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)

  const groups = data ?? []
  const groupIds = groups.map((g) => g.id)
  const memberCountByGroup = new Map<string, number>()
  if (groupIds.length > 0) {
    const { data: memberRows } = await admin
      .from('group_members')
      .select('group_id')
      .in('group_id', groupIds)
      .is('left_at', null)
    for (const row of memberRows ?? []) {
      memberCountByGroup.set(
        row.group_id,
        (memberCountByGroup.get(row.group_id) ?? 0) + 1,
      )
    }
  }

  return groups.map((g) => ({
    ...g,
    member_count: memberCountByGroup.get(g.id) ?? 0,
  }))
}

export async function getGroupById(tenantId: string, id: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('student_groups')
    .select(
      `id, name, code, intake_year, intake_period, status, current_cycle,
       curriculum_id, snapshotted_at, notes, created_at, program_id,
       academic_programs(id, name, code),
       curriculums(id, name, version, status)`,
    )
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getGroupSubjects(tenantId: string, groupId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('group_subjects')
    .select(
      `id, group_id, cycle, credits, is_required, sequence, status, subject_id,
       subjects(id, name, code, credits)`,
    )
    .eq('tenant_id', tenantId)
    .eq('group_id', groupId)
    .order('cycle', { ascending: true })
    .order('sequence', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getGroupMembers(
  tenantId: string,
  groupId: string,
  options: { includeInactive?: boolean } = {},
) {
  const admin = createAdminClient()
  let query = admin
    .from('group_members')
    .select('id, group_id, student_id, joined_at, left_at')
    .eq('tenant_id', tenantId)
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true })
  if (!options.includeInactive) query = query.is('left_at', null)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return []

  const studentIds = Array.from(new Set(data.map((m) => m.student_id)))
  const { data: profiles } = await admin
    .from('user_profiles')
    .select('id, full_name, document_type, document_number')
    .in('id', studentIds)
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))
  return data.map((m) => ({
    ...m,
    user_profile: profileById.get(m.student_id) ?? null,
  }))
}

export async function getPublishedCurriculumsForProgram(
  tenantId: string,
  programId: string,
) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('curriculums')
    .select('id, name, version, cycles, status, published_at')
    .eq('tenant_id', tenantId)
    .eq('program_id', programId)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('version', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getStudentsAvailableForGroup(tenantId: string, groupId: string) {
  const admin = createAdminClient()

  const { data: studentRoleRows, error: rolesErr } = await admin
    .from('user_roles')
    .select('user_id, roles!inner(code)')
    .eq('tenant_id', tenantId)
    .eq('roles.code', 'student')
    .is('revoked_at', null)
  if (rolesErr) throw new Error(rolesErr.message)

  const studentIds = Array.from(new Set((studentRoleRows ?? []).map((r) => r.user_id)))
  if (studentIds.length === 0) return []

  const { data: memberships, error: memErr } = await admin
    .from('user_tenant_memberships')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .in('user_id', studentIds)
  if (memErr) throw new Error(memErr.message)
  const activeMembershipIds = new Set((memberships ?? []).map((m) => m.user_id))

  const { data: currentMembers, error: cmErr } = await admin
    .from('group_members')
    .select('student_id')
    .eq('tenant_id', tenantId)
    .eq('group_id', groupId)
    .is('left_at', null)
  if (cmErr) throw new Error(cmErr.message)
  const alreadyMemberIds = new Set((currentMembers ?? []).map((m) => m.student_id))

  const candidateIds = studentIds.filter(
    (id) => activeMembershipIds.has(id) && !alreadyMemberIds.has(id),
  )
  if (candidateIds.length === 0) return []

  const { data: profiles, error: pErr } = await admin
    .from('user_profiles')
    .select('id, full_name, document_type, document_number')
    .in('id', candidateIds)
    .order('full_name', { ascending: true })
    .limit(50)
  if (pErr) throw new Error(pErr.message)
  return profiles ?? []
}
