'use server'

import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { logActivity } from '@/lib/audit/activity'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateTerminologySchema } from '@/lib/validators/terminology'
import { TERM_KEYS } from '@/lib/terminology/defaults'

export type UpdateTerminologyResult = { success: true } | { error: string }

export async function updateTerminologyAction(
  _prev: unknown,
  formData: FormData,
): Promise<UpdateTerminologyResult> {
  const session = await requireSession()
  await requirePermission('tenants:write')

  if (!session.activeTenantId) {
    return { error: 'No hay tenant activo' }
  }

  const raw: Record<string, { singular: string; plural: string }> = {} as Record<
    string,
    { singular: string; plural: string }
  >
  for (const key of TERM_KEYS) {
    raw[key] = {
      singular: ((formData.get(`${key}.singular`) as string | null) ?? '').trim(),
      plural: ((formData.get(`${key}.plural`) as string | null) ?? '').trim(),
    }
  }

  const parsed = updateTerminologySchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }
  }

  const admin = createAdminClient()
  const tenantId = session.activeTenantId

  const { data: current, error: loadError } = await admin
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()

  if (loadError || !current) {
    return { error: 'No se pudo cargar el tenant' }
  }

  const currentSettings =
    typeof current.settings === 'object' && current.settings !== null && !Array.isArray(current.settings)
      ? (current.settings as Record<string, unknown>)
      : {}

  const nextSettings = { ...currentSettings, terminology: parsed.data }

  const { error: updateError } = await admin
    .from('tenants')
    .update({ settings: nextSettings })
    .eq('id', tenantId)

  if (updateError) {
    return { error: 'No se pudo guardar la terminologia' }
  }

  await logActivity({
    tenantId,
    actorUserId: session.userId,
    actionCode: 'tenant.terminology_updated',
    resourceType: 'tenant',
    resourceId: tenantId,
    summary: 'Terminologia actualizada',
    metadata: { updated_count: TERM_KEYS.length },
  })

  revalidatePath('/a', 'layout')

  return { success: true }
}
