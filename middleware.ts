import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { parseHostname, resolveTenant } from '@/lib/tenant/resolver'

const PUBLIC_ROUTES = ['/login', '/activate', '/forgot-password', '/reset-password']
const TENANT_COOKIE = 'tuto-active-tenant'
const NOT_FOUND_SUBDOMAIN_PATH = '/not-found-subdomain'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host')

  // ── Hostname → tenant resolution (runs BEFORE auth) ────────────────────────
  // Allow the not-found-subdomain page from any host (no tenant context required).
  if (!pathname.startsWith(NOT_FOUND_SUBDOMAIN_PATH)) {
    const ctx = parseHostname(host)

    // Has-subdomain path: either production subdomain (*.creadigitalagency.com)
    // or dev subdomain (*.localhost / *.local). Both require DB resolution.
    if (ctx.subdomain) {
      const tenant = await resolveTenant(host)
      if (!tenant) {
        return NextResponse.redirect(new URL(NOT_FOUND_SUBDOMAIN_PATH, request.url))
      }

      // Mutate request headers so downstream RSC/route handlers can read tenant context.
      request.headers.set('x-tenant-id', tenant.tenantId)
      request.headers.set('x-tenant-subdomain', tenant.subdomain)

      const response = await runAuthAndContinue(request, (res) => {
        // URL is canonical → always overwrite the switcher cookie on subdomain hosts.
        res.cookies.set(TENANT_COOKIE, tenant.tenantId, {
          httpOnly: false,
          sameSite: 'lax',
          path: '/',
        })
      })
      return response
    }

    // No subdomain → apex / vercel preview / bare localhost → no tenant context.
    // Fall through to normal auth flow; do NOT clear the cookie (super admin
    // may have selected a tenant via the switcher).
  }

  return runAuthAndContinue(request)
}

// ── Existing auth + redirect logic, factored out so we can wrap responses ────
async function runAuthAndContinue(
  request: NextRequest,
  onResponse?: (response: NextResponse) => void,
): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Allow not-found-subdomain from any auth state.
  if (pathname.startsWith(NOT_FOUND_SUBDOMAIN_PATH)) {
    onResponse?.(supabaseResponse)
    return addSecurityHeaders(supabaseResponse)
  }

  // Public routes — allow even without auth
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    if (user && pathname === '/login') {
      const redirectResponse = NextResponse.redirect(new URL('/', request.url))
      onResponse?.(redirectResponse)
      return redirectResponse
    }
    onResponse?.(supabaseResponse)
    return addSecurityHeaders(supabaseResponse)
  }

  // Protected routes — redirect to login if no user
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    const redirectResponse = NextResponse.redirect(loginUrl)
    onResponse?.(redirectResponse)
    return redirectResponse
  }

  // Root redirect — go to appropriate portal
  if (pathname === '/') {
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('roles(code)')
      .is('revoked_at', null)

    const roles = (userRoles ?? [])
      .map((ur) => (ur.roles as unknown as { code: string })?.code)
      .filter(Boolean)

    const adminRoles = ['super_admin', 'admin', 'coordinator', 'treasurer']
    if (roles.some((r) => adminRoles.includes(r))) {
      const redirectResponse = NextResponse.redirect(new URL('/a', request.url))
      onResponse?.(redirectResponse)
      return redirectResponse
    }
    if (roles.includes('teacher')) {
      const redirectResponse = NextResponse.redirect(new URL('/t', request.url))
      onResponse?.(redirectResponse)
      return redirectResponse
    }
    const redirectResponse = NextResponse.redirect(new URL('/s', request.url))
    onResponse?.(redirectResponse)
    return redirectResponse
  }

  onResponse?.(supabaseResponse)
  return addSecurityHeaders(supabaseResponse)
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
