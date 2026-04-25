import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/activate', '/forgot-password', '/reset-password']

export async function middleware(request: NextRequest) {
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

  // Public routes — allow even without auth
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    if (user && pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return addSecurityHeaders(supabaseResponse)
  }

  // Protected routes — redirect to login if no user
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
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
      return NextResponse.redirect(new URL('/a', request.url))
    }
    if (roles.includes('teacher')) {
      return NextResponse.redirect(new URL('/t', request.url))
    }
    return NextResponse.redirect(new URL('/s', request.url))
  }

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
