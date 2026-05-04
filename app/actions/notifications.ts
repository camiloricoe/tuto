'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireSession } from '@/lib/auth/session'

export type Notification = {
  id: string
  kind: string
  title: string
  body: string
  link: string | null
  read_at: string | null
  created_at: string
}

export async function getUnreadCountAction(): Promise<number> {
  const session = await requireSession()

  if (!session.activeTenantId) return 0

  const admin = createAdminClient()
  const { count } = await admin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', session.activeTenantId)
    .eq('user_id', session.userId)
    .is('read_at', null)

  return count ?? 0
}

export async function getNotificationsAction(): Promise<Notification[]> {
  const session = await requireSession()

  if (!session.activeTenantId) return []

  const admin = createAdminClient()
  const { data } = await admin
    .from('notifications')
    .select('id, kind, title, body, link, read_at, created_at')
    .eq('tenant_id', session.activeTenantId)
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false })
    .limit(20)

  return data ?? []
}

export async function markAsReadAction(notificationId: string): Promise<void> {
  const session = await requireSession()

  if (!session.activeTenantId) return

  const admin = createAdminClient()
  await admin
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', session.userId)
    .eq('tenant_id', session.activeTenantId)
    .is('read_at', null)
}

export async function markAllReadAction(): Promise<void> {
  const session = await requireSession()

  if (!session.activeTenantId) return

  const admin = createAdminClient()
  await admin
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', session.userId)
    .eq('tenant_id', session.activeTenantId)
    .is('read_at', null)
}
