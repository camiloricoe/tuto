'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { logActivity } from '@/lib/audit/activity'
import {
  createGroupSchema,
  updateGroupSchema,
  addGroupMemberSchema,
  updateGroupSubjectSchema,
} from '@/lib/validators/groups'

const SNAPSHOT_ERROR_MESSAGES: Record<string, string> = {
  group_not_found: 'El grupo no existe',
  curriculum_not_found: 'El pensum no existe',
  tenant_mismatch: 'El pensum no pertenece al mismo tenant que el grupo',
  program_mismatch: 'El pensum no pertenece al programa del grupo',
  curriculum_not_published: 'El pensum no esta publicado',
  group_already_snapshotted: 'El grupo ya tiene un plan asignado',
}

function translateSnapshotError(message: string | null | undefined): string {
  if (!message) return 'Error al aplicar el pensum'
  for (const [key, label] of Object.entries(SNAPSHOT_ERROR_MESSAGES)) {
    if (message.includes(key)) return label
  }
  return 'Error al aplicar el pensum'
}

export async function createGroupAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('groups:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const curriculumIdRaw = (formData.get('curriculumId') as string) || undefined
  const parsed = createGroupSchema.safeParse({
    programId: formData.get('programId') as string,
    name: formData.get('name') as string,
    code: (formData.get('code') as string) || undefined,
    intakeYear: Number(formData.get('intakeYear')),
    intakePeriod: (formData.get('intakePeriod') as string) || undefined,
    currentCycle: formData.get('currentCycle')
      ? Number(formData.get('currentCycle'))
      : 1,
    notes: (formData.get('notes') as string) || undefined,
    curriculumId: curriculumIdRaw,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const {
    programId,
    name,
    code,
    intakeYear,
    intakePeriod,
    currentCycle,
    notes,
    curriculumId,
  } = parsed.data

  const { data: existing } = await admin
    .from('student_groups')
    .select('id')
    .eq('tenant_id', session.activeTenantId)
    .eq('program_id', programId)
    .eq('name', name)
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) {
    return { error: `Ya existe un grupo con el nombre "${name}" en este programa` }
  }

  const { data, error } = await admin
    .from('student_groups')
    .insert({
      tenant_id: session.activeTenantId,
      program_id: programId,
      name,
      code: code ?? null,
      intake_year: intakeYear,
      intake_period: intakePeriod ?? null,
      current_cycle: currentCycle ?? 1,
      status: 'active',
      notes: notes ?? null,
      created_by: session.userId,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: 'Error al crear el grupo' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'group.created',
    resourceType: 'student_group',
    resourceId: data.id,
    summary: `Grupo ${name} (${intakeYear}) creado`,
    metadata: { name, intakeYear, programId },
  })

  let snapshotError: string | null = null
  let snapshotCopied = 0
  if (curriculumId) {
    const { data: rpcData, error: rpcError } = await admin.rpc(
      'snapshot_curriculum_into_group',
      { p_curriculum_id: curriculumId, p_group_id: data.id },
    )
    if (rpcError) {
      snapshotError = translateSnapshotError(rpcError.message)
    } else {
      snapshotCopied = typeof rpcData === 'number' ? rpcData : 0
      await logActivity({
        tenantId: session.activeTenantId,
        actorUserId: session.userId,
        actionCode: 'group.snapshot',
        resourceType: 'student_group',
        resourceId: data.id,
        summary: `Pensum aplicado al grupo ${name} (${snapshotCopied} materias)`,
        metadata: { curriculumId, copied: snapshotCopied },
      })
    }
  }

  revalidatePath('/a/academic/groups')
  revalidatePath(`/a/academic/groups/${data.id}`)

  if (snapshotError) {
    return { success: true, id: data.id, warning: snapshotError }
  }
  return { success: true, id: data.id }
}

export async function updateGroupAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('groups:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const groupId = formData.get('groupId') as string
  if (!groupId) return { error: 'ID de grupo requerido' }

  const parsed = updateGroupSchema.safeParse({
    name: (formData.get('name') as string) || undefined,
    code: (formData.get('code') as string) || undefined,
    intakePeriod: (formData.get('intakePeriod') as string) || undefined,
    status: (formData.get('status') as string) || undefined,
    currentCycle: formData.get('currentCycle')
      ? Number(formData.get('currentCycle'))
      : undefined,
    notes: (formData.get('notes') as string) || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { name, code, intakePeriod, status, currentCycle, notes } = parsed.data

  const { error } = await admin
    .from('student_groups')
    .update({
      ...(name !== undefined && { name }),
      ...(code !== undefined && { code }),
      ...(intakePeriod !== undefined && { intake_period: intakePeriod }),
      ...(status !== undefined && { status }),
      ...(currentCycle !== undefined && { current_cycle: currentCycle }),
      ...(notes !== undefined && { notes }),
      updated_by: session.userId,
    })
    .eq('id', groupId)
    .eq('tenant_id', session.activeTenantId)

  if (error) {
    return { error: 'Error al actualizar el grupo' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'group.updated',
    resourceType: 'student_group',
    resourceId: groupId,
    summary: `Grupo ${groupId} actualizado`,
    metadata: {},
  })

  revalidatePath('/a/academic/groups')
  revalidatePath(`/a/academic/groups/${groupId}`)
  return { success: true }
}

export async function snapshotCurriculumIntoGroupAction(
  groupId: string,
  curriculumId: string,
) {
  const session = await requireSession()
  await requirePermission('groups:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const admin = createAdminClient()

  const { data: group } = await admin
    .from('student_groups')
    .select('id, tenant_id')
    .eq('id', groupId)
    .eq('tenant_id', session.activeTenantId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!group) return { error: 'El grupo no existe' }

  const { data, error } = await admin.rpc('snapshot_curriculum_into_group', {
    p_curriculum_id: curriculumId,
    p_group_id: groupId,
  })

  if (error) {
    return { error: translateSnapshotError(error.message) }
  }

  const copied = typeof data === 'number' ? data : 0

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'group.snapshot',
    resourceType: 'student_group',
    resourceId: groupId,
    summary: `Pensum aplicado al grupo (${copied} materias)`,
    metadata: { curriculumId, copied },
  })

  revalidatePath('/a/academic/groups')
  revalidatePath(`/a/academic/groups/${groupId}`)
  return { success: true, copied }
}

export async function archiveGroupAction(groupId: string) {
  const session = await requireSession()
  await requirePermission('groups:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('student_groups')
    .update({ status: 'archived', updated_by: session.userId })
    .eq('id', groupId)
    .eq('tenant_id', session.activeTenantId)
    .is('deleted_at', null)

  if (error) {
    return { error: 'Error al archivar el grupo' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'group.archived',
    resourceType: 'student_group',
    resourceId: groupId,
    summary: `Grupo ${groupId} archivado`,
    metadata: {},
  })

  revalidatePath('/a/academic/groups')
  revalidatePath(`/a/academic/groups/${groupId}`)
  return { success: true }
}

export async function deleteGroupAction(groupId: string) {
  const session = await requireSession()
  await requirePermission('groups:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const admin = createAdminClient()

  const { count, error: countError } = await admin
    .from('group_members')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', session.activeTenantId)
    .eq('group_id', groupId)
    .is('left_at', null)
  if (countError) {
    return { error: 'Error al verificar miembros activos' }
  }
  if ((count ?? 0) > 0) {
    return { error: 'No se puede eliminar un grupo con miembros activos' }
  }

  const { error } = await admin
    .from('student_groups')
    .update({ deleted_at: new Date().toISOString(), updated_by: session.userId })
    .eq('id', groupId)
    .eq('tenant_id', session.activeTenantId)

  if (error) {
    return { error: 'Error al eliminar el grupo' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'group.deleted',
    resourceType: 'student_group',
    resourceId: groupId,
    summary: `Grupo ${groupId} eliminado`,
    metadata: {},
  })

  revalidatePath('/a/academic/groups')
  return { success: true }
}

export async function addGroupMemberAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('groups:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const parsed = addGroupMemberSchema.safeParse({
    groupId: formData.get('groupId') as string,
    studentId: formData.get('studentId') as string,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { groupId, studentId } = parsed.data

  const { data: existing } = await admin
    .from('group_members')
    .select('id')
    .eq('tenant_id', session.activeTenantId)
    .eq('group_id', groupId)
    .eq('student_id', studentId)
    .is('left_at', null)
    .maybeSingle()

  if (existing) {
    return { error: 'El estudiante ya es miembro activo del grupo' }
  }

  const { data, error } = await admin
    .from('group_members')
    .insert({
      tenant_id: session.activeTenantId,
      group_id: groupId,
      student_id: studentId,
      created_by: session.userId,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: 'Error al agregar el miembro' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'group.member_added',
    resourceType: 'student_group',
    resourceId: groupId,
    summary: `Estudiante ${studentId} agregado al grupo ${groupId}`,
    metadata: { studentId, memberId: data.id },
  })

  revalidatePath(`/a/academic/groups/${groupId}`)
  return { success: true, id: data.id }
}

export async function removeGroupMemberAction(memberId: string) {
  const session = await requireSession()
  await requirePermission('groups:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const admin = createAdminClient()

  const { data: member } = await admin
    .from('group_members')
    .select('id, group_id')
    .eq('id', memberId)
    .eq('tenant_id', session.activeTenantId)
    .maybeSingle()
  if (!member) return { error: 'El miembro no existe' }

  const { error } = await admin
    .from('group_members')
    .update({ left_at: new Date().toISOString() })
    .eq('id', memberId)
    .eq('tenant_id', session.activeTenantId)

  if (error) {
    return { error: 'Error al remover el miembro' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'group.member_removed',
    resourceType: 'student_group',
    resourceId: member.group_id,
    summary: `Miembro ${memberId} removido del grupo`,
    metadata: { memberId },
  })

  revalidatePath(`/a/academic/groups/${member.group_id}`)
  return { success: true }
}

export async function updateGroupSubjectAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('groups:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const parsed = updateGroupSubjectSchema.safeParse({
    id: formData.get('id') as string,
    cycle: formData.get('cycle') ? Number(formData.get('cycle')) : undefined,
    credits: formData.get('credits') ? Number(formData.get('credits')) : undefined,
    isRequired:
      formData.get('isRequired') !== null
        ? formData.get('isRequired') === 'true'
        : undefined,
    sequence: formData.get('sequence') ? Number(formData.get('sequence')) : undefined,
    status: (formData.get('status') as string) || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { id, cycle, credits, isRequired, sequence, status } = parsed.data

  const { data: row } = await admin
    .from('group_subjects')
    .select('id, group_id')
    .eq('id', id)
    .eq('tenant_id', session.activeTenantId)
    .maybeSingle()
  if (!row) return { error: 'La materia del grupo no existe' }

  const { error } = await admin
    .from('group_subjects')
    .update({
      ...(cycle !== undefined && { cycle }),
      ...(credits !== undefined && { credits }),
      ...(isRequired !== undefined && { is_required: isRequired }),
      ...(sequence !== undefined && { sequence }),
      ...(status !== undefined && { status }),
    })
    .eq('id', id)
    .eq('tenant_id', session.activeTenantId)

  if (error) {
    return { error: 'Error al actualizar la materia del grupo' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'group.subject_updated',
    resourceType: 'group_subject',
    resourceId: id,
    summary: `Materia del grupo ${id} actualizada`,
    metadata: {},
  })

  revalidatePath(`/a/academic/groups/${row.group_id}`)
  return { success: true }
}
