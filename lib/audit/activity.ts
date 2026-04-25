import { createAdminClient } from '@/lib/supabase/admin'

export type AuthEventType =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | '2fa_enabled'
  | '2fa_verified'
  | 'password_reset'

export async function logActivity(params: {
  tenantId: string
  actorUserId: string
  actionCode: string
  resourceType: string
  resourceId: string
  summary: string
  metadata?: Record<string, string | number | boolean | null>
}): Promise<void> {
  const admin = createAdminClient()
  await admin.from('activity_log').insert({
    tenant_id: params.tenantId,
    actor_user_id: params.actorUserId,
    action_code: params.actionCode,
    resource_type: params.resourceType,
    resource_id: params.resourceId,
    summary: params.summary,
    metadata: params.metadata ?? {},
  })
}

export async function logAuthEvent(params: {
  userId?: string | null
  event: AuthEventType
  ip?: string | null
  userAgent?: string | null
  metadata?: Record<string, string | number | boolean | null>
}): Promise<void> {
  const admin = createAdminClient()
  await admin.from('auth_events').insert({
    user_id: params.userId ?? null,
    event: params.event,
    ip_address: params.ip ?? null,
    user_agent: params.userAgent ?? null,
    metadata: params.metadata ?? {},
  })
}
