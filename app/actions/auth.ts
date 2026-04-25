'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logAuthEvent } from '@/lib/audit/activity'
import { loginLimiter, forgotPasswordLimiter } from '@/lib/auth/rate-limit'
import { TooManyRequestsError } from '@/lib/auth/errors'
import { getPortalForRoles, getSession } from '@/lib/auth/session'
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
      metadata: { email },
    })
    return { error: 'Email o password incorrectos' }
  }

  await logAuthEvent({
    userId: data.user.id,
    event: 'login_success',
    ip,
    userAgent,
  })

  // Get session to determine portal
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
