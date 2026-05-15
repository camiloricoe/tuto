'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/auth/session'
import { ACTIVE_TENANT_COOKIE } from '@/lib/auth/session'
import { logActivity } from '@/lib/audit/activity'

export async function setActiveTenantAction(tenantId: string): Promise<void> {
  const session = await requireSession()

  const target = session.tenants.find((t) => t.id === tenantId)
  if (!target) throw new Error('Tenant no disponible')

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_TENANT_COOKIE, tenantId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  })

  await logActivity({
    tenantId,
    actorUserId: session.userId,
    actionCode: 'tenant.switch',
    resourceType: 'tenant',
    resourceId: tenantId,
    summary: `Cambio de tenant activo a ${target.name}`,
    metadata: { is_super_admin: session.isSuperAdmin },
  })

  revalidatePath('/', 'layout')
}
