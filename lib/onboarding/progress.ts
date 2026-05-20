import { createAdminClient } from '@/lib/supabase/admin'
import { getMilestonesForRole } from './catalog'
import { detectAll, type DetectorContext } from './detector'
import type { Milestone, RoleCode, RoleProgress } from './types'

export async function getProgressForRole(
  ctx: DetectorContext,
  role: RoleCode,
): Promise<RoleProgress> {
  const milestones = getMilestonesForRole(role)
  const [completionMap, dismissals] = await Promise.all([
    detectAll(ctx, role),
    loadDismissals(ctx),
  ])
  return computeProgress(role, milestones, completionMap, dismissals)
}

export function computeProgress(
  role: RoleCode,
  milestones: readonly Milestone[],
  completionMap: ReadonlyMap<string, boolean>,
  dismissals: ReadonlySet<string>,
): RoleProgress {
  const items = milestones.map((milestone) => ({
    milestone,
    completed: completionMap.get(milestone.code) ?? false,
    dismissed: dismissals.has(milestone.code),
  }))

  const total = items.length
  const completed = items.filter((i) => i.completed).length
  const dismissed = items.filter((i) => !i.completed && i.dismissed).length
  const pending = total - completed - dismissed
  const denom = Math.max(1, total - dismissed)
  const percent = Math.round((completed / denom) * 100)

  return {
    role,
    scope: milestones[0]?.scope ?? 'tenant',
    total,
    completed,
    dismissed,
    pending,
    percent,
    items,
  }
}

async function loadDismissals(ctx: DetectorContext): Promise<Set<string>> {
  const admin = createAdminClient()
  const query = admin
    .from('user_milestone_dismissals')
    .select('milestone_code')
    .eq('user_id', ctx.userId)
  const finalQuery = ctx.tenantId
    ? query.eq('tenant_id', ctx.tenantId)
    : query.is('tenant_id', null)
  const { data } = await finalQuery
  return new Set((data ?? []).map((d) => d.milestone_code))
}
