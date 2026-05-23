'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { logActivity } from '@/lib/audit/activity'
import {
  createCurriculumSchema,
  updateCurriculumSchema,
  addCurriculumSubjectSchema,
  updateCurriculumSubjectSchema,
} from '@/lib/validators/curriculums'

export async function createCurriculumAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('curriculums:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const parsed = createCurriculumSchema.safeParse({
    programId: formData.get('programId') as string,
    name: formData.get('name') as string,
    version: (formData.get('version') as string) || undefined,
    cycles: Number(formData.get('cycles')),
    notes: (formData.get('notes') as string) || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { programId, name, version, cycles, notes } = parsed.data

  const { data: existing } = await admin
    .from('curriculums')
    .select('id')
    .eq('tenant_id', session.activeTenantId)
    .eq('program_id', programId)
    .eq('name', name)
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) {
    return { error: `Ya existe un pensum con el nombre "${name}" en este programa` }
  }

  const { data, error } = await admin
    .from('curriculums')
    .insert({
      tenant_id: session.activeTenantId,
      program_id: programId,
      name,
      version: version ?? '1',
      cycles,
      status: 'draft',
      notes: notes ?? null,
      created_by: session.userId,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: 'Error al crear el pensum' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'curriculum.created',
    resourceType: 'curriculum',
    resourceId: data.id,
    summary: `Pensum ${name} (v${version ?? '1'}) creado`,
    metadata: { name, version: version ?? '1', cycles },
  })

  revalidatePath('/a/academic/curriculums')
  return { success: true, id: data.id }
}

export async function updateCurriculumAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('curriculums:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const curriculumId = formData.get('curriculumId') as string
  if (!curriculumId) return { error: 'ID de pensum requerido' }

  const parsed = updateCurriculumSchema.safeParse({
    name: (formData.get('name') as string) || undefined,
    version: (formData.get('version') as string) || undefined,
    cycles: formData.get('cycles') ? Number(formData.get('cycles')) : undefined,
    notes: (formData.get('notes') as string) || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()

  const { data: current } = await admin
    .from('curriculums')
    .select('status')
    .eq('id', curriculumId)
    .eq('tenant_id', session.activeTenantId)
    .is('deleted_at', null)
    .single()

  if (!current) return { error: 'Pensum no encontrado' }
  if (current.status === 'archived') {
    return { error: 'No se puede editar un pensum archivado' }
  }

  const { name, version, cycles, notes } = parsed.data
  const { error } = await admin
    .from('curriculums')
    .update({
      ...(name && { name }),
      ...(version && { version }),
      ...(cycles !== undefined && { cycles }),
      ...(notes !== undefined && { notes }),
      updated_by: session.userId,
    })
    .eq('id', curriculumId)
    .eq('tenant_id', session.activeTenantId)

  if (error) {
    return { error: 'Error al actualizar el pensum' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'curriculum.updated',
    resourceType: 'curriculum',
    resourceId: curriculumId,
    summary: `Pensum ${curriculumId} actualizado`,
    metadata: {},
  })

  revalidatePath('/a/academic/curriculums')
  revalidatePath(`/a/academic/curriculums/${curriculumId}`)
  return { success: true }
}

export async function publishCurriculumAction(curriculumId: string) {
  const session = await requireSession()
  await requirePermission('curriculums:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const admin = createAdminClient()

  const { data: current } = await admin
    .from('curriculums')
    .select('status, name, version')
    .eq('id', curriculumId)
    .eq('tenant_id', session.activeTenantId)
    .is('deleted_at', null)
    .single()

  if (!current) return { error: 'Pensum no encontrado' }
  if (current.status !== 'draft') {
    return { error: 'Solo se pueden publicar pensums en estado borrador' }
  }

  const { count } = await admin
    .from('curriculum_subjects')
    .select('id', { count: 'exact', head: true })
    .eq('curriculum_id', curriculumId)

  if (!count || count === 0) {
    return { error: 'El pensum debe tener al menos una materia para publicarse' }
  }

  const { error } = await admin
    .from('curriculums')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      published_by: session.userId,
      updated_by: session.userId,
    })
    .eq('id', curriculumId)
    .eq('tenant_id', session.activeTenantId)

  if (error) {
    return { error: 'Error al publicar el pensum' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'curriculum.published',
    resourceType: 'curriculum',
    resourceId: curriculumId,
    summary: `Pensum ${current.name} (v${current.version}) publicado`,
    metadata: { name: current.name, version: current.version },
  })

  revalidatePath('/a/academic/curriculums')
  revalidatePath(`/a/academic/curriculums/${curriculumId}`)
  return { success: true }
}

export async function archiveCurriculumAction(curriculumId: string) {
  const session = await requireSession()
  await requirePermission('curriculums:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const admin = createAdminClient()

  const { data: current } = await admin
    .from('curriculums')
    .select('status, name, version')
    .eq('id', curriculumId)
    .eq('tenant_id', session.activeTenantId)
    .is('deleted_at', null)
    .single()

  if (!current) return { error: 'Pensum no encontrado' }
  if (current.status !== 'published') {
    return { error: 'Solo se pueden archivar pensums publicados' }
  }

  const { error } = await admin
    .from('curriculums')
    .update({ status: 'archived', updated_by: session.userId })
    .eq('id', curriculumId)
    .eq('tenant_id', session.activeTenantId)

  if (error) {
    return { error: 'Error al archivar el pensum' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'curriculum.archived',
    resourceType: 'curriculum',
    resourceId: curriculumId,
    summary: `Pensum ${current.name} (v${current.version}) archivado`,
    metadata: { name: current.name, version: current.version },
  })

  revalidatePath('/a/academic/curriculums')
  revalidatePath(`/a/academic/curriculums/${curriculumId}`)
  return { success: true }
}

export async function deleteCurriculumAction(curriculumId: string) {
  const session = await requireSession()
  await requirePermission('curriculums:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const admin = createAdminClient()

  const { data: current } = await admin
    .from('curriculums')
    .select('status, name')
    .eq('id', curriculumId)
    .eq('tenant_id', session.activeTenantId)
    .is('deleted_at', null)
    .single()

  if (!current) return { error: 'Pensum no encontrado' }

  if (current.status === 'published') {
    const { count } = await admin
      .from('student_groups')
      .select('id', { count: 'exact', head: true })
      .eq('curriculum_id', curriculumId)
      .is('deleted_at', null)

    if (count && count > 0) {
      return { error: 'No se puede eliminar: hay grupos basados en este pensum' }
    }
  }

  const { error } = await admin
    .from('curriculums')
    .update({ deleted_at: new Date().toISOString(), updated_by: session.userId })
    .eq('id', curriculumId)
    .eq('tenant_id', session.activeTenantId)

  if (error) {
    return { error: 'Error al eliminar el pensum' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'curriculum.deleted',
    resourceType: 'curriculum',
    resourceId: curriculumId,
    summary: `Pensum ${current.name} eliminado`,
    metadata: { name: current.name },
  })

  revalidatePath('/a/academic/curriculums')
  return { success: true }
}

async function assertCurriculumIsDraft(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  curriculumId: string,
): Promise<{ error: string } | null> {
  const { data } = await admin
    .from('curriculums')
    .select('status')
    .eq('id', curriculumId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .single()
  if (!data) return { error: 'Pensum no encontrado' }
  if (data.status !== 'draft') {
    return { error: 'Solo se pueden editar materias de pensums en borrador' }
  }
  return null
}

export async function addCurriculumSubjectAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('curriculums:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const parsed = addCurriculumSubjectSchema.safeParse({
    curriculumId: formData.get('curriculumId') as string,
    subjectId: formData.get('subjectId') as string,
    cycle: Number(formData.get('cycle')),
    credits: formData.get('credits') ? Number(formData.get('credits')) : undefined,
    isRequired: formData.get('isRequired') === 'false' ? false : true,
    sequence: formData.get('sequence') ? Number(formData.get('sequence')) : undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { curriculumId, subjectId, cycle, credits, isRequired, sequence } = parsed.data

  const guard = await assertCurriculumIsDraft(admin, session.activeTenantId, curriculumId)
  if (guard) return guard

  const { data, error } = await admin
    .from('curriculum_subjects')
    .insert({
      tenant_id: session.activeTenantId,
      curriculum_id: curriculumId,
      subject_id: subjectId,
      cycle,
      credits: credits ?? null,
      is_required: isRequired ?? true,
      sequence: sequence ?? 0,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: 'Error al agregar la materia al pensum' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'curriculum_subject.added',
    resourceType: 'curriculum_subject',
    resourceId: data.id,
    summary: `Materia agregada al pensum (ciclo ${cycle})`,
    metadata: { curriculum_id: curriculumId, subject_id: subjectId, cycle },
  })

  revalidatePath(`/a/academic/curriculums/${curriculumId}`)
  return { success: true, id: data.id }
}

export async function removeCurriculumSubjectAction(id: string) {
  const session = await requireSession()
  await requirePermission('curriculums:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const admin = createAdminClient()

  const { data: row } = await admin
    .from('curriculum_subjects')
    .select('id, curriculum_id')
    .eq('id', id)
    .eq('tenant_id', session.activeTenantId)
    .single()

  if (!row) return { error: 'Materia no encontrada' }

  const guard = await assertCurriculumIsDraft(admin, session.activeTenantId, row.curriculum_id)
  if (guard) return guard

  const { error } = await admin
    .from('curriculum_subjects')
    .delete()
    .eq('id', id)
    .eq('tenant_id', session.activeTenantId)

  if (error) {
    return { error: 'Error al eliminar la materia del pensum' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'curriculum_subject.removed',
    resourceType: 'curriculum_subject',
    resourceId: id,
    summary: `Materia removida del pensum`,
    metadata: { curriculum_id: row.curriculum_id },
  })

  revalidatePath(`/a/academic/curriculums/${row.curriculum_id}`)
  return { success: true }
}

export async function updateCurriculumSubjectAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('curriculums:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const parsed = updateCurriculumSubjectSchema.safeParse({
    id: formData.get('id') as string,
    cycle: formData.get('cycle') ? Number(formData.get('cycle')) : undefined,
    credits: formData.get('credits') ? Number(formData.get('credits')) : undefined,
    isRequired:
      formData.get('isRequired') === undefined || formData.get('isRequired') === null
        ? undefined
        : formData.get('isRequired') === 'true',
    sequence: formData.get('sequence') ? Number(formData.get('sequence')) : undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { id, cycle, credits, isRequired, sequence } = parsed.data

  const { data: row } = await admin
    .from('curriculum_subjects')
    .select('id, curriculum_id')
    .eq('id', id)
    .eq('tenant_id', session.activeTenantId)
    .single()

  if (!row) return { error: 'Materia no encontrada' }

  const guard = await assertCurriculumIsDraft(admin, session.activeTenantId, row.curriculum_id)
  if (guard) return guard

  const { error } = await admin
    .from('curriculum_subjects')
    .update({
      ...(cycle !== undefined && { cycle }),
      ...(credits !== undefined && { credits }),
      ...(isRequired !== undefined && { is_required: isRequired }),
      ...(sequence !== undefined && { sequence }),
    })
    .eq('id', id)
    .eq('tenant_id', session.activeTenantId)

  if (error) {
    return { error: 'Error al actualizar la materia del pensum' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'curriculum_subject.updated',
    resourceType: 'curriculum_subject',
    resourceId: id,
    summary: `Materia del pensum actualizada`,
    metadata: { curriculum_id: row.curriculum_id },
  })

  revalidatePath(`/a/academic/curriculums/${row.curriculum_id}`)
  return { success: true }
}
