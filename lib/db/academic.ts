import { createAdminClient } from '@/lib/supabase/admin'

export async function getPrograms(tenantId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('academic_programs')
    .select('id, name, code, modality, duration_periods, description, created_at')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('name')
  if (error) throw new Error(error.message)
  return data
}

export async function getProgramById(tenantId: string, programId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('academic_programs')
    .select('id, name, code, modality, duration_periods, description, created_at')
    .eq('tenant_id', tenantId)
    .eq('id', programId)
    .is('deleted_at', null)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getPeriods(tenantId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('academic_periods')
    .select('id, name, code, kind, starts_on, ends_on, active, program_id, created_at')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('starts_on', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function getSubjects(tenantId: string, programId?: string) {
  const admin = createAdminClient()
  let query = admin
    .from('subjects')
    .select('id, name, code, credits, program_id, default_grading_scheme_id, created_at')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('name')
  if (programId) query = query.eq('program_id', programId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function getCourses(tenantId: string, periodId?: string) {
  const admin = createAdminClient()
  let query = admin
    .from('courses')
    .select(
      `id, section_code, status, max_students, teacher_id, created_at,
       subjects(id, name, code),
       academic_periods(id, name, code),
       grading_schemes(id, name)`,
    )
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (periodId) query = query.eq('period_id', periodId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function getCourseById(tenantId: string, courseId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('courses')
    .select(
      `id, section_code, status, max_students, teacher_id, created_at,
       subjects(id, name, code),
       academic_periods(id, name, code),
       grading_schemes(id, name, scale_min, scale_max, passing_grade, uses_letters, letter_mapping),
       course_evaluations(id, name, code, weight, sequence, due_on)`,
    )
    .eq('tenant_id', tenantId)
    .eq('id', courseId)
    .is('deleted_at', null)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getTeacherCourses(tenantId: string, teacherId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('courses')
    .select(
      `id, section_code, status, max_students, created_at,
       subjects(id, name, code),
       academic_periods(id, name, code)`,
    )
    .eq('tenant_id', tenantId)
    .eq('teacher_id', teacherId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function getCourseRoster(tenantId: string, courseId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('enrollments')
    .select(
      `id, status, enrolled_at, final_grade, final_letter,
       user_profiles!enrollments_student_id_fkey(id, full_name)`,
    )
    .eq('tenant_id', tenantId)
    .eq('course_id', courseId)
    .is('deleted_at', null)
    .order('enrolled_at')
  if (error) throw new Error(error.message)
  return data
}

export async function getStudentEnrollments(tenantId: string, studentId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('enrollments')
    .select(
      `id, status, enrolled_at, final_grade, final_letter,
       courses(
         id, section_code, status,
         subjects(id, name, code),
         academic_periods(id, name, code)
       )`,
    )
    .eq('tenant_id', tenantId)
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .order('enrolled_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function getStudentGrades(tenantId: string, enrollmentId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('grades')
    .select(
      `id, value, letter, status, comment, published_at,
       course_evaluations(id, name, code, weight, sequence)`,
    )
    .eq('tenant_id', tenantId)
    .eq('enrollment_id', enrollmentId)
    .order('created_at')
  if (error) throw new Error(error.message)
  return data
}

export async function getCourseGrades(tenantId: string, courseId: string) {
  const admin = createAdminClient()
  // Get all enrollments and their grades for this course
  const { data, error } = await admin
    .from('enrollments')
    .select(
      `id, student_id, final_grade, final_letter, status,
       user_profiles!enrollments_student_id_fkey(id, full_name),
       grades(id, value, letter, status, evaluation_id, comment)`,
    )
    .eq('tenant_id', tenantId)
    .eq('course_id', courseId)
    .is('deleted_at', null)
    .order('enrolled_at')
  if (error) throw new Error(error.message)
  return data
}

export async function getGradingSchemes(tenantId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('grading_schemes')
    .select('id, name, scale_min, scale_max, passing_grade, uses_letters, letter_mapping')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('name')
  if (error) throw new Error(error.message)
  return data
}
