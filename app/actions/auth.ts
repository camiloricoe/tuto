'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuthEvent } from '@/lib/audit/activity'
import { loginLimiter, forgotPasswordLimiter } from '@/lib/auth/rate-limit'
import { TooManyRequestsError } from '@/lib/auth/errors'
import { ACTIVE_TENANT_COOKIE, getPortalForRoles, getSession } from '@/lib/auth/session'
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@/lib/validators/auth'

function getClientInfo() {
  // headers() is async in Next.js 16
  return headers().then((h) => ({
    ip: h.get('x-forwarded-for')?.split(',')[0] ?? 'unknown',
    userAgent: h.get('user-agent') ?? 'unknown',
  }))
}

export async function loginAction(_prevState: unknown, formData: FormData) {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: 'Datos invalidos' }
  }

  // Optional tenant context from login page (subdomain host).
  const rawTenantId = formData.get('tenantId')
  const rawTenantName = formData.get('tenantName')
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const tenantId =
    typeof rawTenantId === 'string' && UUID_RE.test(rawTenantId)
      ? rawTenantId
      : null
  const tenantName =
    typeof rawTenantName === 'string' && rawTenantName.length > 0 && rawTenantName.length <= 200
      ? rawTenantName
      : null

  const { email, password } = parsed.data
  const { ip, userAgent } = await getClientInfo()

  // Rate limit
  const { success: allowed } = await loginLimiter.limit(`login:${ip}:${email}`)
  if (!allowed) {
    return { error: 'Demasiados intentos. Espera unos minutos.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    await logAuthEvent({
      userId: null,
      event: 'login_failed',
      ip,
      userAgent,
      metadata: { email, tenantId },
    })
    return { error: 'Email o password incorrectos' }
  }

  // Tenant-aware enforcement: when login happened on a tenant subdomain,
  // require the user to have a membership + at least one active role in THAT tenant.
  // Super admins are allowed across all tenants.
  if (tenantId) {
    const admin = createAdminClient()

    const { data: profile } = await admin
      .from('user_profiles')
      .select('is_super_admin')
      .eq('id', data.user.id)
      .maybeSingle()

    const isSuperAdmin = profile?.is_super_admin === true

    if (!isSuperAdmin) {
      const { data: membership } = await admin
        .from('user_tenant_memberships')
        .select('id')
        .eq('user_id', data.user.id)
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .maybeSingle()

      const { data: activeRoles } = await admin
        .from('user_roles')
        .select('id')
        .eq('user_id', data.user.id)
        .eq('tenant_id', tenantId)
        .is('revoked_at', null)
        .limit(1)

      const hasRole = (activeRoles?.length ?? 0) > 0

      if (!membership || !hasRole) {
        // Cross-tenant attempt: sign them out and reject with a friendly message.
        await supabase.auth.signOut()
        await logAuthEvent({
          userId: data.user.id,
          event: 'login_failed',
          ip,
          userAgent,
          metadata: { email, tenantId, reason: 'cross_tenant' },
        })
        const label = tenantName ?? 'esta institucion'
        return {
          error: `Este correo no esta registrado en ${label}. Verifica que estas en el portal correcto.`,
        }
      }
    }

    // Pin the active-tenant cookie to the subdomain's tenant so the session/portal
    // resolves into the correct tenant context after redirect.
    const cookieStore = await cookies()
    cookieStore.set(ACTIVE_TENANT_COOKIE, tenantId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
  }

  await logAuthEvent({
    userId: data.user.id,
    event: 'login_success',
    ip,
    userAgent,
    metadata: tenantId ? { tenantId } : undefined,
  })

  // Get session to determine portal (after the cookie pin above so role lookup
  // uses the tenant context we just enforced).
  const session = await getSession()
  if (!session) {
    return { error: 'Error al cargar sesion' }
  }

  const portal = getPortalForRoles(session.roles)
  redirect(portal)
}

export async function logoutAction() {
  const session = await getSession()
  const { ip, userAgent } = await getClientInfo()

  if (session) {
    await logAuthEvent({
      userId: session.userId,
      event: 'logout',
      ip,
      userAgent,
    })
  }

  const supabase = await createClient()
  await supabase.auth.signOut()

  // Clear the pinned tenant cookie so the next login resolves cleanly on
  // the current subdomain instead of replaying a stale tenant context.
  const cookieStore = await cookies()
  cookieStore.delete(ACTIVE_TENANT_COOKIE)

  redirect('/login')
}

export async function forgotPasswordAction(_prevState: unknown, formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get('email') as string,
  })

  if (!parsed.success) {
    return { error: 'Email invalido' }
  }

  const { email } = parsed.data
  const { success: allowed } = await forgotPasswordLimiter.limit(`forgot:${email}`)
  if (!allowed) {
    return { error: 'Demasiados intentos. Espera una hora.' }
  }

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  })

  // Always return success to prevent email enumeration
  return { success: true }
}

export async function resetPasswordAction(_prevState: unknown, formData: FormData) {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get('password') as string,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Password invalido' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) {
    return { error: 'Error al cambiar password' }
  }

  redirect('/login')
}
