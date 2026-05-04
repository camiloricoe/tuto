import { createAdminClient } from '@/lib/supabase/admin'

type NotificationKind = 'grade_published' | 'payment_received' | 'payment_due' | 'announcement'

export async function createNotification(params: {
  tenantId: string
  userId: string
  kind: NotificationKind
  title: string
  body: string
  link?: string
}): Promise<void> {
  const admin = createAdminClient()
  await admin.from('notifications').insert({
    tenant_id: params.tenantId,
    user_id: params.userId,
    kind: params.kind,
    title: params.title,
    body: params.body,
    link: params.link ?? null,
  })
}

export async function createBulkNotifications(notifications: Array<{
  tenantId: string
  userId: string
  kind: NotificationKind
  title: string
  body: string
  link?: string
}>): Promise<void> {
  const admin = createAdminClient()
  await admin.from('notifications').insert(
    notifications.map((n) => ({
      tenant_id: n.tenantId,
      user_id: n.userId,
      kind: n.kind,
      title: n.title,
      body: n.body,
      link: n.link ?? null,
    })),
  )
}
