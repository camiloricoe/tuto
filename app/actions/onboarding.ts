'use server'

import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMilestone } from '@/lib/onboarding/catalog'

type Result = { success: true } | { error: string }

export async function dismissMilestoneAction(
  milestoneCode: string,
): Promise<Result> {
  const session = await requireSession()
  const milestone = getMilestone(milestoneCode)
  if (!milestone) return { error: 'Milestone desconocido' }

  const tenantId =
    milestone.scope === 'global' ? null : session.activeTenantId
  if (milestone.scope === 'tenant' && !tenantId) {
    return { error: 'Sin tenant activo' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('user_milestone_dismissals').insert({
    user_id: session.userId,
    tenant_id: tenantId,
    milestone_code: milestoneCode,
  })

  // 23505 = unique violation → already dismissed, treat as success
  if (error && error.code !== '23505') {
    return { error: 'No se pudo ocultar el milestone' }
  }

  revalidateWelcomePaths()
  return { success: true }
}

export async function restoreMilestoneAction(
  milestoneCode: string,
): Promise<Result> {
  const session = await requireSession()
  const milestone = getMilestone(milestoneCode)
  if (!milestone) return { error: 'Milestone desconocido' }

  const tenantId =
    milestone.scope === 'global' ? null : session.activeTenantId

  const admin = createAdminClient()
  const base = admin
    .from('user_milestone_dismissals')
    .delete()
    .eq('user_id', session.userId)
    .eq('milestone_code', milestoneCode)
  const query = tenantId ? base.eq('tenant_id', tenantId) : base.is('tenant_id', null)

  const { error } = await query
  if (error) return { error: 'No se pudo restaurar' }

  revalidateWelcomePaths()
  return { success: true }
}

function revalidateWelcomePaths() {
  revalidatePath('/a/welcome')
  revalidatePath('/t/welcome')
  revalidatePath('/s/welcome')
  revalidatePath('/a')
  revalidatePath('/t')
  revalidatePath('/s')
}
