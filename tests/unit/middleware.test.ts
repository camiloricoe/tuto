/**
 * Unit tests for hostname-aware tenant resolution in `middleware.ts`.
 *
 * We mock the Supabase SSR client (auth always returns null user → the
 * middleware bails out to `/login` for protected routes; for the apex case
 * we drive a path that's still observable). We mock `@/lib/tenant/resolver`
 * so we can drive `resolveTenant` outcomes for each hostname pattern.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ResolvedTenant } from '@/lib/tenant/resolver'

// ─── Mocks ────────────────────────────────────────────────────────────────────
const resolveTenantMock = vi.fn<(host: string | null | undefined) => Promise<ResolvedTenant | null>>()

vi.mock('@/lib/tenant/resolver', async () => {
  // Pull the real `parseHostname` (pure) but mock `resolveTenant` (DB-touching).
  const actual = await vi.importActual<typeof import('@/lib/tenant/resolver')>(
    '@/lib/tenant/resolver',
  )
  return {
    ...actual,
    resolveTenant: (host: string | null | undefined) => resolveTenantMock(host),
  }
})

vi.mock('server-only', () => ({}))

vi.mock('next/cache', () => ({
  unstable_cache: (fn: () => Promise<unknown>) => fn,
  revalidateTag: vi.fn(),
}))

// Fake authenticated user so root-redirect logic and protected routes don't
// short-circuit and obscure the tenant behavior we care about here.
const supabaseFromMock = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  is: vi.fn().mockResolvedValue({ data: [], error: null }),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
    from: supabaseFromMock,
  })),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────
type MockNextRequest = {
  nextUrl: URL
  url: string
  headers: Headers
  cookies: {
    getAll: () => Array<{ name: string; value: string }>
    set: (name: string, value: string) => void
  }
}

function buildRequest(host: string, pathname = '/some-protected'): MockNextRequest {
  // Strip port for URL building when http: → use as-is.
  const url = `http://${host}${pathname}`
  return {
    nextUrl: new URL(url),
    url,
    headers: new Headers({ host }),
    cookies: {
      getAll: () => [],
      set: vi.fn(),
    },
  }
}

async function callMiddleware(req: MockNextRequest) {
  // Import lazily so mocks are wired before module load.
  const mod = await import('@/middleware')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mod.middleware(req as any)
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('middleware: hostname-aware tenant resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('apex hostname → does NOT call resolveTenant, does NOT set tenant cookie', async () => {
    const req = buildRequest('creadigitalagency.com', '/a/dashboard')
    const res = await callMiddleware(req)

    expect(resolveTenantMock).not.toHaveBeenCalled()
    // No tenant cookie was set (cookies.set on the response is undefined for the cookie name).
    const setCookieHeader = res.headers.get('set-cookie') ?? ''
    expect(setCookieHeader).not.toContain('tuto-active-tenant=')
  })

  it('www apex → treated as apex (no resolver call)', async () => {
    const req = buildRequest('www.creadigitalagency.com', '/a/dashboard')
    await callMiddleware(req)
    expect(resolveTenantMock).not.toHaveBeenCalled()
  })

  it('bare localhost → treated as apex (no resolver call)', async () => {
    const req = buildRequest('localhost:3000', '/a/dashboard')
    await callMiddleware(req)
    expect(resolveTenantMock).not.toHaveBeenCalled()
  })

  it('*.vercel.app preview → treated as apex (no resolver call)', async () => {
    const req = buildRequest('tuto-flame.vercel.app', '/a/dashboard')
    await callMiddleware(req)
    expect(resolveTenantMock).not.toHaveBeenCalled()
  })

  it('production subdomain → calls resolveTenant, sets tenant cookie + headers', async () => {
    const tenant: ResolvedTenant = {
      tenantId: 'tenant-abc',
      name: 'INDECAP',
      subdomain: 'indecap',
      source: 'subdomain',
    }
    resolveTenantMock.mockResolvedValueOnce(tenant)

    const req = buildRequest('indecap.creadigitalagency.com', '/a/dashboard')
    const res = await callMiddleware(req)

    expect(resolveTenantMock).toHaveBeenCalledWith('indecap.creadigitalagency.com')
    // Request headers were mutated for downstream consumers.
    expect(req.headers.get('x-tenant-id')).toBe('tenant-abc')
    expect(req.headers.get('x-tenant-subdomain')).toBe('indecap')
    // Response sets the cookie (authoritative URL wins over switcher).
    const setCookieHeader = res.headers.get('set-cookie') ?? ''
    expect(setCookieHeader).toContain('tuto-active-tenant=tenant-abc')
  })

  it('dev subdomain (*.localhost) → resolves same as production subdomain', async () => {
    const tenant: ResolvedTenant = {
      tenantId: 'tenant-xyz',
      name: 'INDECAP DEV',
      subdomain: 'indecap',
      source: 'subdomain',
    }
    resolveTenantMock.mockResolvedValueOnce(tenant)

    const req = buildRequest('indecap.localhost:3000', '/a/dashboard')
    const res = await callMiddleware(req)

    expect(resolveTenantMock).toHaveBeenCalledWith('indecap.localhost:3000')
    expect(req.headers.get('x-tenant-id')).toBe('tenant-xyz')
    expect(req.headers.get('x-tenant-subdomain')).toBe('indecap')
    const setCookieHeader = res.headers.get('set-cookie') ?? ''
    expect(setCookieHeader).toContain('tuto-active-tenant=tenant-xyz')
  })

  it('unknown subdomain → redirects to /not-found-subdomain', async () => {
    resolveTenantMock.mockResolvedValueOnce(null)

    const req = buildRequest('ghost.creadigitalagency.com', '/a/dashboard')
    const res = await callMiddleware(req)

    expect(resolveTenantMock).toHaveBeenCalled()
    expect(res.status).toBe(307) // NextResponse.redirect default
    expect(res.headers.get('location')).toContain('/not-found-subdomain')
  })

  it('/not-found-subdomain path itself does NOT trigger resolver (no redirect loop)', async () => {
    const req = buildRequest('ghost.creadigitalagency.com', '/not-found-subdomain')
    const res = await callMiddleware(req)

    expect(resolveTenantMock).not.toHaveBeenCalled()
    // Should not redirect to itself
    const loc = res.headers.get('location') ?? ''
    expect(loc).not.toContain('/not-found-subdomain')
  })
})
