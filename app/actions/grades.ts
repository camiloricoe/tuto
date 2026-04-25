'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { logActivity } from '@/lib/audit/activity'
import { saveGradeDraftsSchema, publishGradesSchema, closeCourseSchema } from '@/lib/validators/grades'
import { calculateFinalGrade, applyLetter, roundGrade } from '@/lib/grades/calculate'

export async function saveDraftsAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('grades:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  // Parse grades JSON from form
  let gradesRaw: unknown
  try {
    gradesRaw = JSON.parse(formData.get('grades') as string)
  } catch {
    return { error: 'Formato de notas invalido' }
  }

  const parsed = saveGradeDraftsSchema.safeParse({
    courseId: formData.get('courseId') as string,
    grades: gradesRaw,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { courseId, grades } = parsed.data

  // Upsert grades as drafts
  const upsertData = grades.map((g) => ({
    tenant_id: session.activeTenantId!,
    enrollment_id: g.enrollmentId,
    evaluation_id: g.evaluationId,
    value: g.value,
    comment: g.comment ?? null,
    status: 'draft',
    created_by: session.userId,
    updated_by: session.userId,
  }))

  const { error } = await admin
    .from('grades')
    .upsert(upsertData, { onConflict: 'enrollment_id,evaluation_id' })

  if (error) {
    return { error: 'Error al guardar las notas' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'grades.drafts_saved',
    resourceType: 'course',
    resourceId: courseId,
    summary: `${grades.length} notas guardadas como borrador`,
    metadata: { count: grades.length },
  })

  return { success: true }
}

export async function publishGradesAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('grades:publish')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const parsed = publishGradesSchema.safeParse({
    courseId: formData.get('courseId') as string,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { courseId } = parsed.data

  // Get course with grading scheme and evaluations
  const { data: course, error: courseError } = await admin
    .from('courses')
    .select(`
      id, grading_scheme_id,
      grading_schemes(scale_min, scale_max, passing_grade, uses_letters, letter_mapping),
      course_evaluations(id, weight)
    `)
    .eq('id', courseId)
    .eq('tenant_id', session.activeTenantId)
    .single()

  if (courseError || !course) {
    return { error: 'Curso no encontrado' }
  }

  const scheme = course.grading_schemes as unknown as {
    scale_min: number
    scale_max: number
    passing_grade: number
    uses_letters: boolean
    letter_mapping: Record<string, number> | null
  }

  const evaluations = (course.course_evaluations as unknown as Array<{ id: string; weight: number }>) ?? []

  // Get all draft grades for this course
  const { data: enrollments } = await admin
    .from('enrollments')
    .select('id, student_id')
    .eq('course_id', courseId)
    .eq('tenant_id', session.activeTenantId)
    .is('deleted_at', null)

  const now = new Date().toISOString()

  for (const enrollment of enrollments ?? []) {
    const { data: gradeRows } = await admin
      .from('grades')
      .select('evaluation_id, value')
      .eq('enrollment_id', enrollment.id)
      .eq('tenant_id', session.activeTenantId)

    const gradeEntries = (gradeRows ?? []).map((g) => ({
      evaluationId: g.evaluation_id,
      value: g.value,
    }))

    const finalGrade = roundGrade(
      calculateFinalGrade(gradeEntries, evaluations.map((e) => ({ id: e.id, weight: e.weight })), {
        scaleMin: scheme.scale_min,
        scaleMax: scheme.scale_max,
        passingGrade: scheme.passing_grade,
        usesLetters: scheme.uses_letters,
        letterMapping: scheme.letter_mapping,
      }),
      2,
    )

    const finalLetter = scheme.uses_letters
      ? applyLetter(finalGrade, scheme.letter_mapping)
      : null

    // Publish all draft grades for this enrollment
    await admin
      .from('grades')
      .update({
        status: 'published',
        published_at: now,
        published_by: session.userId,
        updated_by: session.userId,
      })
      .eq('enrollment_id', enrollment.id)
      .eq('tenant_id', session.activeTenantId)
      .eq('status', 'draft')

    // Update final grade on enrollment
    await admin
      .from('enrollments')
      .update({
        final_grade: finalGrade,
        final_letter: finalLetter,
      })
      .eq('id', enrollment.id)
      .eq('tenant_id', session.activeTenantId)
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'grades.published',
    resourceType: 'course',
    resourceId: courseId,
    summary: `Notas publicadas para curso ${courseId}`,
    metadata: { courseId },
  })

  return { success: true }
}

export async function closeCourseAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('academic:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const parsed = closeCourseSchema.safeParse({
    courseId: formData.get('courseId') as string,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { courseId } = parsed.data

  const { error } = await admin
    .from('courses')
    .update({ status: 'closed', updated_by: session.userId })
    .eq('id', courseId)
    .eq('tenant_id', session.activeTenantId)

  if (error) {
    return { error: 'Error al cerrar el curso' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'course.closed',
    resourceType: 'course',
    resourceId: courseId,
    summary: `Curso ${courseId} cerrado`,
    metadata: {},
  })

  return { success: true }
}
