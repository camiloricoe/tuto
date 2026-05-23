import { createAdminClient } from '@/lib/supabase/admin'

export async function getCurriculums(tenantId: string, programId?: string) {
  const admin = createAdminClient()
  let query = admin
    .from('curriculums')
    .select(
      `id, name, version, cycles, status, notes, published_at, created_at, program_id,
       academic_programs(id, name, code)`,
    )
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
  if (programId) query = query.eq('program_id', programId)
  const { data, error } = await query
  if (error) throw new Error(error.message)

  const sorted = (data ?? []).slice().sort((a, b) => {
    const programA =
      ((a.academic_programs as unknown as { name?: string } | null)?.name ?? '').toLowerCase()
    const programB =
      ((b.academic_programs as unknown as { name?: string } | null)?.name ?? '').toLowerCase()
    if (programA !== programB) return programA < programB ? -1 : 1
    return b.version.localeCompare(a.version, undefined, { numeric: true })
  })

  const curriculumIds = sorted.map((c) => c.id)
  const subjectCountByCurriculum = new Map<string, number>()
  if (curriculumIds.length > 0) {
    const { data: subjectRows } = await admin
      .from('curriculum_subjects')
      .select('curriculum_id')
      .in('curriculum_id', curriculumIds)
    for (const row of subjectRows ?? []) {
      subjectCountByCurriculum.set(
        row.curriculum_id,
        (subjectCountByCurriculum.get(row.curriculum_id) ?? 0) + 1,
      )
    }
  }

  return sorted.map((c) => ({
    ...c,
    subject_count: subjectCountByCurriculum.get(c.id) ?? 0,
  }))
}

export async function getCurriculumById(tenantId: string, id: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('curriculums')
    .select(
      `id, name, version, cycles, status, notes, published_at, published_by, created_at, program_id,
       academic_programs(id, name, code)`,
    )
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getCurriculumSubjects(tenantId: string, curriculumId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('curriculum_subjects')
    .select(
      `id, curriculum_id, cycle, credits, is_required, sequence, subject_id,
       subjects(id, name, code, credits)`,
    )
    .eq('tenant_id', tenantId)
    .eq('curriculum_id', curriculumId)
    .order('cycle', { ascending: true })
    .order('sequence', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getPublishedCurriculumsForProgram(tenantId: string, programId: string) {
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

export async function getSubjectsAvailableForCurriculum(tenantId: string, curriculumId: string) {
  const admin = createAdminClient()

  const { data: curriculum, error: cErr } = await admin
    .from('curriculums')
    .select('id, program_id')
    .eq('tenant_id', tenantId)
    .eq('id', curriculumId)
    .is('deleted_at', null)
    .single()
  if (cErr) throw new Error(cErr.message)
  if (!curriculum) return []

  const { data: taken, error: tErr } = await admin
    .from('curriculum_subjects')
    .select('subject_id')
    .eq('curriculum_id', curriculumId)
  if (tErr) throw new Error(tErr.message)
  const takenIds = new Set((taken ?? []).map((r) => r.subject_id))

  const { data: subjects, error: sErr } = await admin
    .from('subjects')
    .select('id, name, code, credits')
    .eq('tenant_id', tenantId)
    .eq('program_id', curriculum.program_id)
    .is('deleted_at', null)
    .order('name')
  if (sErr) throw new Error(sErr.message)

  return (subjects ?? []).filter((s) => !takenIds.has(s.id))
}
