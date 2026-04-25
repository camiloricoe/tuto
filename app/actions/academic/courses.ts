'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { logActivity } from '@/lib/audit/activity'
import { createCourseSchema, updateCourseSchema } from '@/lib/validators/academic'

export async function createCourseAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('academic:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const parsed = createCourseSchema.safeParse({
    subjectId: formData.get('subjectId') as string,
    periodId: formData.get('periodId') as string,
    gradingSchemeId: formData.get('gradingSchemeId') as string,
    teacherId: (formData.get('teacherId') as string) || undefined,
    sectionCode: (formData.get('sectionCode') as string) || undefined,
    maxStudents: formData.get('maxStudents') ? Number(formData.get('maxStudents')) : undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { subjectId, periodId, gradingSchemeId, teacherId, sectionCode, maxStudents } = parsed.data

  const { data, error } = await admin
    .from('courses')
    .insert({
      tenant_id: session.activeTenantId,
      subject_id: subjectId,
      period_id: periodId,
      grading_scheme_id: gradingSchemeId,
      teacher_id: teacherId ?? null,
      section_code: sectionCode ?? '',
      max_students: maxStudents ?? null,
      created_by: session.userId,
    })
    .select('id')
    .single()

  if (error) {
    return { error: 'Error al crear el curso' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'course.created',
    resourceType: 'course',
    resourceId: data.id,
    summary: `Curso creado para materia ${subjectId} en periodo ${periodId}`,
    metadata: { subjectId, periodId },
  })

  return { success: true, id: data.id }
}

export async function updateCourseAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('academic:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const courseId = formData.get('courseId') as string
  if (!courseId) return { error: 'ID de curso requerido' }

  const parsed = updateCourseSchema.safeParse({
    teacherId: (formData.get('teacherId') as string) || undefined,
    sectionCode: (formData.get('sectionCode') as string) || undefined,
    maxStudents: formData.get('maxStudents') ? Number(formData.get('maxStudents')) : undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { teacherId, sectionCode, maxStudents } = parsed.data

  const { error } = await admin
    .from('courses')
    .update({
      ...(teacherId !== undefined && { teacher_id: teacherId }),
      ...(sectionCode !== undefined && { section_code: sectionCode }),
      ...(maxStudents !== undefined && { max_students: maxStudents }),
      updated_by: session.userId,
    })
    .eq('id', courseId)
    .eq('tenant_id', session.activeTenantId)

  if (error) {
    return { error: 'Error al actualizar el curso' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'course.updated',
    resourceType: 'course',
    resourceId: courseId,
    summary: `Curso ${courseId} actualizado`,
    metadata: {},
  })

  return { success: true }
}

export async function deleteCourseAction(courseId: string) {
  const session = await requireSession()
  await requirePermission('academic:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('courses')
    .update({ deleted_at: new Date().toISOString(), updated_by: session.userId })
    .eq('id', courseId)
    .eq('tenant_id', session.activeTenantId)

  if (error) {
    return { error: 'Error al eliminar el curso' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'course.deleted',
    resourceType: 'course',
    resourceId: courseId,
    summary: `Curso ${courseId} eliminado`,
    metadata: {},
  })

  return { success: true }
}
