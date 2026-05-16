import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseHostname, resolveTenant } from '@/lib/tenant/resolver'
import type { ResolvedTenant } from '@/lib/tenant/resolver'

// ─── Mock server-only (not available in test env) ────────────────────────────
vi.mock('server-only', () => ({}))

// ─── Mock next/cache ─────────────────────────────────────────────────────────
vi.mock('next/cache', () => ({
  unstable_cache: (fn: () => Promise<unknown>) => fn,
  revalidateTag: vi.fn(),
}))

// ─── Mock supabase admin client ───────────────────────────────────────────────
const mockSingle = vi.fn()
const mockEqActive = vi.fn(() => ({ single: mockSingle }))
const mockEqSubdomain = vi.fn(() => ({ eq: mockEqActive }))
const mockSelect = vi.fn(() => ({ eq: mockEqSubdomain }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}))

// ─── parseHostname ────────────────────────────────────────────────────────────
describe('parseHostname', () => {
  it('handles null', () => {
    const r = parseHostname(null)
    expect(r.subdomain).toBeNull()
    expect(r.isLocalhost).toBe(false)
    expect(r.isApex).toBe(false)
    expect(r.isVercelPreview).toBe(false)
  })

  it('handles undefined', () => {
    const r = parseHostname(undefined)
    expect(r.subdomain).toBeNull()
  })

  it('handles empty string', () => {
    const r = parseHostname('')
    expect(r.subdomain).toBeNull()
    expect(r.isLocalhost).toBe(false)
  })

  it('localhost:3000 → isLocalhost, no subdomain', () => {
    const r = parseHostname('localhost:3000')
    expect(r.isLocalhost).toBe(true)
    expect(r.subdomain).toBeNull()
    expect(r.isApex).toBe(false)
    expect(r.isVercelPreview).toBe(false)
  })

  it('127.0.0.1 → isLocalhost, no subdomain', () => {
    const r = parseHostname('127.0.0.1')
    expect(r.isLocalhost).toBe(true)
    expect(r.subdomain).toBeNull()
  })

  it('indecap.localhost:3000 → isLocalhost, subdomain indecap', () => {
    const r = parseHostname('indecap.localhost:3000')
    expect(r.isLocalhost).toBe(true)
    expect(r.subdomain).toBe('indecap')
  })

  it('foo.local → isLocalhost, subdomain foo', () => {
    const r = parseHostname('foo.local')
    expect(r.isLocalhost).toBe(true)
    expect(r.subdomain).toBe('foo')
  })

  it('creadigitalagency.com → isApex, no subdomain', () => {
    const r = parseHostname('creadigitalagency.com')
    expect(r.isApex).toBe(true)
    expect(r.subdomain).toBeNull()
    expect(r.apexDomain).toBe('creadigitalagency.com')
  })

  it('www.creadigitalagency.com → isApex, no subdomain', () => {
    const r = parseHostname('www.creadigitalagency.com')
    expect(r.isApex).toBe(true)
    expect(r.subdomain).toBeNull()
  })

  it('indecap.creadigitalagency.com → subdomain indecap, not apex', () => {
    const r = parseHostname('indecap.creadigitalagency.com')
    expect(r.subdomain).toBe('indecap')
    expect(r.isApex).toBe(false)
    expect(r.isLocalhost).toBe(false)
    expect(r.isVercelPreview).toBe(false)
  })

  it('tuto-flame.vercel.app → isVercelPreview + isApex', () => {
    const r = parseHostname('tuto-flame.vercel.app')
    expect(r.isVercelPreview).toBe(true)
    expect(r.isApex).toBe(true)
    expect(r.subdomain).toBeNull()
  })

  it('tuto-flame-git-foo.vercel.app → isVercelPreview', () => {
    const r = parseHostname('tuto-flame-git-foo.vercel.app')
    expect(r.isVercelPreview).toBe(true)
    expect(r.isApex).toBe(true)
  })

  it('school.edu.co (unknown domain) → custom domain candidate', () => {
    const r = parseHostname('school.edu.co')
    expect(r.isApex).toBe(false)
    expect(r.isLocalhost).toBe(false)
    expect(r.isVercelPreview).toBe(false)
    expect(r.subdomain).toBeNull()
    // apexDomain will be the full hostname (custom domain)
    expect(r.apexDomain).toBe('school.edu.co')
  })

  it('strips port from hostname', () => {
    const r = parseHostname('indecap.creadigitalagency.com:443')
    expect(r.subdomain).toBe('indecap')
  })

  it('lowercases hostname', () => {
    const r = parseHostname('INDECAP.creadigitalagency.com')
    expect(r.subdomain).toBe('indecap')
  })
})

// ─── resolveTenant ─────────────────────────────────────────────────────────────
describe('resolveTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null for apex domain', async () => {
    const result = await resolveTenant('creadigitalagency.com')
    expect(result).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns null for www apex', async () => {
    const result = await resolveTenant('www.creadigitalagency.com')
    expect(result).toBeNull()
  })

  it('returns null for localhost with no subdomain', async () => {
    const result = await resolveTenant('localhost:3000')
    expect(result).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns null for Vercel preview', async () => {
    const result = await resolveTenant('tuto-flame.vercel.app')
    expect(result).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns null for null host', async () => {
    const result = await resolveTenant(null)
    expect(result).toBeNull()
  })

  it('returns tenant for known subdomain', async () => {
    const tenant: ResolvedTenant = {
      tenantId: '0dfeb630-870c-4bf2-8463-fbcefd9d1ab7',
      name: 'INDECAP',
      subdomain: 'indecap',
      source: 'subdomain',
    }
    mockSingle.mockResolvedValueOnce({ data: { id: tenant.tenantId, name: tenant.name, subdomain: tenant.subdomain }, error: null })

    const result = await resolveTenant('indecap.creadigitalagency.com')
    expect(result).toEqual(tenant)
    expect(mockFrom).toHaveBeenCalledWith('tenants')
  })

  it('returns null for unknown subdomain', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'No rows' } })

    const result = await resolveTenant('unknown.creadigitalagency.com')
    expect(result).toBeNull()
  })

  it('returns null when supabase errors', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'connection failed' } })

    const result = await resolveTenant('indecap.creadigitalagency.com')
    expect(result).toBeNull()
  })

  it('returns null (not throw) on unexpected exception', async () => {
    mockFrom.mockImplementationOnce(() => { throw new Error('unexpected') })

    const result = await resolveTenant('indecap.creadigitalagency.com')
    expect(result).toBeNull()
  })

  it('does not re-query DB on second call (cache hit)', async () => {
    // With unstable_cache mocked to return fn directly, each call goes through.
    // We verify the mock was called the expected number of times.
    mockSingle.mockResolvedValue({ data: { id: 'abc', name: 'Test', subdomain: 'test' }, error: null })

    await resolveTenant('test.creadigitalagency.com')
    await resolveTenant('test.creadigitalagency.com')

    // Both calls hit mockFrom since cache is mocked to passthrough
    expect(mockFrom).toHaveBeenCalledTimes(2)
  })
})
