'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { logActivity } from '@/lib/audit/activity'
import { createProgramSchema, updateProgramSchema } from '@/lib/validators/academic'

export async function createProgramAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('academic:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const parsed = createProgramSchema.safeParse({
    name: formData.get('name') as string,
    code: formData.get('code') as string,
    modality: formData.get('modality') as string,
    durationPeriods: Number(formData.get('durationPeriods')),
    description: (formData.get('description') as string) || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { name, code, modality, durationPeriods, description } = parsed.data

  // Check code uniqueness within tenant
  const { data: existing } = await admin
    .from('academic_programs')
    .select('id')
    .eq('tenant_id', session.activeTenantId)
    .eq('code', code)
    .is('deleted_at', null)
    .single()

  if (existing) {
    return { error: `El codigo ${code} ya esta en uso` }
  }

  const { data, error } = await admin.from('academic_programs').insert({
    tenant_id: session.activeTenantId,
    name,
    code,
    modality,
    duration_periods: durationPeriods,
    description: description ?? null,
    created_by: session.userId,
  }).select('id').single()

  if (error) {
    return { error: 'Error al crear el programa' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'academic_program.created',
    resourceType: 'academic_program',
    resourceId: data.id,
    summary: `Programa ${name} (${code}) creado`,
    metadata: { name, code, modality },
  })

  return { success: true, id: data.id }
}

export async function updateProgramAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('academic:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const programId = formData.get('programId') as string
  if (!programId) return { error: 'ID de programa requerido' }

  const parsed = updateProgramSchema.safeParse({
    name: formData.get('name') as string || undefined,
    code: formData.get('code') as string || undefined,
    modality: formData.get('modality') as string || undefined,
    durationPeriods: formData.get('durationPeriods') ? Number(formData.get('durationPeriods')) : undefined,
    description: formData.get('description') as string || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { name, code, modality, durationPeriods, description } = parsed.data

  const { error } = await admin
    .from('academic_programs')
    .update({
      ...(name && { name }),
      ...(code && { code }),
      ...(modality && { modality }),
      ...(durationPeriods !== undefined && { duration_periods: durationPeriods }),
      ...(description !== undefined && { description }),
      updated_by: session.userId,
    })
    .eq('id', programId)
    .eq('tenant_id', session.activeTenantId)

  if (error) {
    return { error: 'Error al actualizar el programa' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'academic_program.updated',
    resourceType: 'academic_program',
    resourceId: programId,
    summary: `Programa ${programId} actualizado`,
    metadata: {},
  })

  return { success: true }
}

export async function deleteProgramAction(programId: string) {
  const session = await requireSession()
  await requirePermission('academic:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('academic_programs')
    .update({ deleted_at: new Date().toISOString(), updated_by: session.userId })
    .eq('id', programId)
    .eq('tenant_id', session.activeTenantId)

  if (error) {
    return { error: 'Error al eliminar el programa' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'academic_program.deleted',
    resourceType: 'academic_program',
    resourceId: programId,
    summary: `Programa ${programId} eliminado`,
    metadata: {},
  })

  return { success: true }
}
