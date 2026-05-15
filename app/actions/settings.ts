'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { logActivity } from '@/lib/audit/activity'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ─── Schemas ────────────────────────────────────────────────────────────────

const createPeriodSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  code: z.string().min(1, 'El codigo es requerido'),
  kind: z.enum(['bimester', 'trimester', 'quadrimester', 'semester']),
  starts_on: z.string().min(1, 'La fecha de inicio es requerida'),
  ends_on: z.string().min(1, 'La fecha de fin es requerida'),
})

const createGradingSchemeSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  scale_min: z.coerce.number().min(0),
  scale_max: z.coerce.number().min(1),
  passing_grade: z.coerce.number().min(0),
  uses_letters: z.boolean().default(false),
})

const createSubjectSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  code: z.string().min(1, 'El codigo es requerido'),
  program_id: z.string().uuid('Programa invalido'),
  credits: z.coerce.number().int().min(0).optional(),
})

// ─── Actions ────────────────────────────────────────────────────────────────

export async function createPeriodAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('academic:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const parsed = createPeriodSchema.safeParse({
    name: formData.get('name') as string,
    code: formData.get('code') as string,
    kind: formData.get('kind') as string,
    starts_on: formData.get('starts_on') as string,
    ends_on: formData.get('ends_on') as string,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { name, code, kind, starts_on, ends_on } = parsed.data

  const { data: period, error } = await admin
    .from('academic_periods')
    .insert({
      tenant_id: session.activeTenantId,
      name,
      code,
      kind,
      starts_on,
      ends_on,
      created_by: session.userId,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ya existe un periodo con ese codigo' }
    }
    return { error: 'Error al crear el periodo' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'period.created',
    resourceType: 'academic_period',
    resourceId: period.id,
    summary: `Periodo "${name}" creado`,
    metadata: { name, code, kind },
  })

  revalidatePath('/a/settings')
  return { success: true }
}

export async function createGradingSchemeAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('academic:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const parsed = createGradingSchemeSchema.safeParse({
    name: formData.get('name') as string,
    scale_min: formData.get('scale_min'),
    scale_max: formData.get('scale_max'),
    passing_grade: formData.get('passing_grade'),
    uses_letters: formData.get('uses_letters') === 'true',
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { name, scale_min, scale_max, passing_grade, uses_letters } = parsed.data

  const { data: scheme, error } = await admin
    .from('grading_schemes')
    .insert({
      tenant_id: session.activeTenantId,
      name,
      scale_min,
      scale_max,
      passing_grade,
      uses_letters,
      created_by: session.userId,
    })
    .select('id')
    .single()

  if (error) {
    return { error: 'Error al crear el esquema de calificacion' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'grading_scheme.created',
    resourceType: 'grading_scheme',
    resourceId: scheme.id,
    summary: `Esquema "${name}" creado`,
    metadata: { name, scale_min, scale_max, passing_grade },
  })

  revalidatePath('/a/settings')
  return { success: true }
}

export async function deletePeriodAction(periodId: string) {
  const session = await requireSession()
  await requirePermission('academic:write')
  if (!session.activeTenantId) return { error: 'No hay tenant activo' }
  const admin = createAdminClient()
  const { error } = await admin
    .from('academic_periods')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', periodId)
    .eq('tenant_id', session.activeTenantId)
  if (error) return { error: 'Error al eliminar el periodo' }
  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'period.deleted',
    resourceType: 'academic_period',
    resourceId: periodId,
    summary: `Periodo eliminado`,
  })
  revalidatePath('/a/settings')
  return { success: true }
}

export async function deleteGradingSchemeAction(schemeId: string) {
  const session = await requireSession()
  await requirePermission('academic:write')
  if (!session.activeTenantId) return { error: 'No hay tenant activo' }
  const admin = createAdminClient()
  const { error } = await admin
    .from('grading_schemes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', schemeId)
    .eq('tenant_id', session.activeTenantId)
  if (error) return { error: 'Error al eliminar el esquema' }
  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'grading_scheme.deleted',
    resourceType: 'grading_scheme',
    resourceId: schemeId,
    summary: `Esquema eliminado`,
  })
  revalidatePath('/a/settings')
  return { success: true }
}

export async function deleteSubjectAction(subjectId: string) {
  const session = await requireSession()
  await requirePermission('academic:write')
  if (!session.activeTenantId) return { error: 'No hay tenant activo' }
  const admin = createAdminClient()
  const { error } = await admin
    .from('subjects')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', subjectId)
    .eq('tenant_id', session.activeTenantId)
  if (error) return { error: 'Error al eliminar la materia' }
  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'subject.deleted',
    resourceType: 'subject',
    resourceId: subjectId,
    summary: `Materia eliminada`,
  })
  revalidatePath('/a/settings')
  return { success: true }
}

export async function createSubjectAction(_prevState: unknown, formData: FormData) {
  const session = await requireSession()
  await requirePermission('academic:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const creditsRaw = formData.get('credits') as string
  const parsed = createSubjectSchema.safeParse({
    name: formData.get('name') as string,
    code: formData.get('code') as string,
    program_id: formData.get('program_id') as string,
    credits: creditsRaw ? Number(creditsRaw) : undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const { name, code, program_id, credits } = parsed.data

  const { data: subject, error } = await admin
    .from('subjects')
    .insert({
      tenant_id: session.activeTenantId,
      name,
      code,
      program_id,
      credits: credits ?? null,
      created_by: session.userId,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ya existe una materia con ese codigo en este programa' }
    }
    return { error: 'Error al crear la materia' }
  }

  await logActivity({
    tenantId: session.activeTenantId,
    actorUserId: session.userId,
    actionCode: 'subject.created',
    resourceType: 'subject',
    resourceId: subject.id,
    summary: `Materia "${name}" creada`,
    metadata: { name, code, program_id },
  })

  revalidatePath('/a/settings')
  return { success: true }
}
