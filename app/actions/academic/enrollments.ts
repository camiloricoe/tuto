'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { logActivity } from '@/lib/audit/activity'
import { createEnrollmentSchema } from '@/lib/validators/academic'

export async function createEnrollmentAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('academic:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const parsed = createEnrollmentSchema.safeParse({
    courseId: formData.get('courseId') as string,
    studentId: formData.get('studentId') as string,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { courseId, studentId } = parsed.data

  // Check for duplicate enrollment
  const { data: existing } = await admin
    .from('enrollments')
    .select('id')
    .eq('tenant_id', session.activeTenantId)
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .single()

  if (existing) {
    return { error: 'El estudiante ya esta inscrito en este curso' }
  }

  const { data, error } = await admin
    .from('enrollments')
    .insert({
      tenant_id: session.activeTenantId,
      course_id: courseId,
      student_id: studentId,
      created_by: session.userId,
    })
    .select('id')
    .single()

  if (error) {
    return { error: 'Error al crear la inscripcion' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'enrollment.created',
    resourceType: 'enrollment',
    resourceId: data.id,
    summary: `Estudiante ${studentId} inscrito en curso ${courseId}`,
    metadata: { courseId, studentId },
  })

  return { success: true, id: data.id }
}

export async function dropEnrollmentAction(enrollmentId: string) {
  const session = await requireSession()
  await requirePermission('academic:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('enrollments')
    .update({
      status: 'dropped',
      deleted_at: new Date().toISOString(),
    })
    .eq('id', enrollmentId)
    .eq('tenant_id', session.activeTenantId)

  if (error) {
    return { error: 'Error al dar de baja la inscripcion' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'enrollment.dropped',
    resourceType: 'enrollment',
    resourceId: enrollmentId,
    summary: `Inscripcion ${enrollmentId} dada de baja`,
    metadata: {},
  })

  return { success: true }
}
