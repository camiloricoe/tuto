import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock the branding queries module BEFORE importing the SUT.
vi.mock('@/lib/branding/queries', () => ({
  getBrandingByTenantId: vi.fn(),
  AUDIT_ACTION_BRANDING_UPDATE: 'branding.update',
}))

import { getBrandingByTenantId } from '@/lib/branding/queries'
import {
  resolveBrandingForPdf,
  fetchLogoBytes,
  _resetLogoCacheForTests,
} from '@/lib/pdf/branding'

const mockedGetBranding = vi.mocked(getBrandingByTenantId)

// Helper to build a minimal TenantBranding row.
function brandingRow(
  overrides: Partial<{
    primary_hsl: string | null
    accent_hsl: string | null
    logo_url: string | null
    support_email: string | null
    support_url: string | null
    email_from_name: string | null
  }> = {},
) {
  return {
    tenant_id: 'tenant-1',
    primary_hsl: '221 83% 53%',
    accent_hsl: '142 76% 36%',
    logo_url: null,
    support_email: 'help@example.com',
    support_url: 'https://example.com/help',
    email_from_name: 'Acme University',
    email_reply_to: null,
    favicon_storage_path: null,
    favicon_url: null,
    login_background_url: null,
    login_message: null,
    logo_storage_path: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  } as Awaited<ReturnType<typeof getBrandingByTenantId>>
}

describe('resolveBrandingForPdf', () => {
  const originalFetch = global.fetch
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  beforeEach(() => {
    _resetLogoCacheForTests()
    mockedGetBranding.mockReset()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xyzproject.supabase.co'
  })

  afterEach(() => {
    global.fetch = originalFetch
    if (originalSupabaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
    }
  })

  it('falls back to TUTO defaults when no branding row exists', async () => {
    mockedGetBranding.mockResolvedValue(null)
    const result = await resolveBrandingForPdf('tenant-1', 'Mi Instituto')

    expect(result.logoBytes).toBeNull()
    expect(result.logoMimeType).toBeNull()
    expect(result.primaryHex).toBe('#1a1a1a')
    expect(result.accentHex).toBe('#555555')
    expect(result.tenantName).toBe('Mi Instituto')
    expect(result.supportEmail).toBeNull()
    expect(result.supportUrl).toBeNull()
  })

  it('falls back to TUTO defaults when the queries throw', async () => {
    mockedGetBranding.mockRejectedValue(new Error('db down'))
    const result = await resolveBrandingForPdf('tenant-1')

    expect(result.primaryHex).toBe('#1a1a1a')
    expect(result.tenantName).toBe('TUTO')
    expect(result.logoBytes).toBeNull()
  })

  it('converts valid HSL strings to hex and prefers branding name', async () => {
    mockedGetBranding.mockResolvedValue(
      brandingRow({ logo_url: null, email_from_name: 'Acme University' }),
    )
    const result = await resolveBrandingForPdf('tenant-1', 'Fallback Name')

    expect(result.primaryHex).toBe('#2463eb')
    expect(result.accentHex).toBe('#16a249')
    expect(result.tenantName).toBe('Acme University')
    expect(result.supportEmail).toBe('help@example.com')
    expect(result.supportUrl).toBe('https://example.com/help')
  })

  it('uses fallback name when branding has no email_from_name', async () => {
    mockedGetBranding.mockResolvedValue(
      brandingRow({ email_from_name: null }),
    )
    const result = await resolveBrandingForPdf('tenant-1', 'Fallback Name')
    expect(result.tenantName).toBe('Fallback Name')
  })

  it('falls back to defaults for malformed HSL values', async () => {
    mockedGetBranding.mockResolvedValue(
      brandingRow({ primary_hsl: 'not-a-color', accent_hsl: '999 999% 999%' }),
    )
    const result = await resolveBrandingForPdf('tenant-1')
    expect(result.primaryHex).toBe('#1a1a1a')
    expect(result.accentHex).toBe('#555555')
  })

  it('fetches logo bytes when logo_url is on the Supabase host', async () => {
    const fakeBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => fakeBytes.buffer,
      headers: new Headers({ 'content-type': 'image/png' }),
    })
    global.fetch = fetchSpy as unknown as typeof fetch

    mockedGetBranding.mockResolvedValue(
      brandingRow({
        logo_url: 'https://xyzproject.supabase.co/storage/v1/object/public/tenant-assets/t/logo.png',
      }),
    )

    const result = await resolveBrandingForPdf('tenant-1')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(result.logoBytes).toEqual(fakeBytes)
    expect(result.logoMimeType).toBe('image/png')
  })

  it('rejects non-HTTPS logo URLs without fetching', async () => {
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy as unknown as typeof fetch

    mockedGetBranding.mockResolvedValue(
      brandingRow({
        logo_url: 'http://xyzproject.supabase.co/storage/v1/object/public/tenant-assets/t/logo.png',
      }),
    )
    const result = await resolveBrandingForPdf('tenant-1')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.logoBytes).toBeNull()
  })

  it('rejects logo URLs on non-Supabase hosts without fetching', async () => {
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy as unknown as typeof fetch

    mockedGetBranding.mockResolvedValue(
      brandingRow({
        logo_url: 'https://evil.example.com/logo.png',
      }),
    )
    const result = await resolveBrandingForPdf('tenant-1')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.logoBytes).toBeNull()
  })

  it('caches logo bytes by URL across calls', async () => {
    const fakeBytes = new Uint8Array([1, 2, 3, 4])
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => fakeBytes.buffer,
      headers: new Headers({ 'content-type': 'image/png' }),
    })
    global.fetch = fetchSpy as unknown as typeof fetch

    mockedGetBranding.mockResolvedValue(
      brandingRow({
        logo_url: 'https://xyzproject.supabase.co/storage/v1/object/public/tenant-assets/t/logo.png',
      }),
    )

    await resolveBrandingForPdf('tenant-1')
    await resolveBrandingForPdf('tenant-1')
    await resolveBrandingForPdf('tenant-1')

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('returns null logo when fetch responds non-OK', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      arrayBuffer: async () => new ArrayBuffer(0),
      headers: new Headers(),
    }) as unknown as typeof fetch

    mockedGetBranding.mockResolvedValue(
      brandingRow({
        logo_url: 'https://xyzproject.supabase.co/storage/v1/object/public/tenant-assets/t/missing.png',
      }),
    )

    const result = await resolveBrandingForPdf('tenant-1')
    expect(result.logoBytes).toBeNull()
  })

  it('returns null logo when fetch throws (e.g. timeout)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('timeout')) as unknown as typeof fetch

    mockedGetBranding.mockResolvedValue(
      brandingRow({
        logo_url: 'https://xyzproject.supabase.co/storage/v1/object/public/tenant-assets/t/logo.png',
      }),
    )

    const result = await resolveBrandingForPdf('tenant-1')
    expect(result.logoBytes).toBeNull()
    // But colors + name still resolve correctly.
    expect(result.primaryHex).toBe('#2463eb')
  })

  it('also accepts generic *.supabase.co hosts (fallback safety net)', async () => {
    // Even if NEXT_PUBLIC_SUPABASE_URL points elsewhere, any *.supabase.co
    // host should pass validation.
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://different-project.supabase.co'
    const fakeBytes = new Uint8Array([9, 9, 9])
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => fakeBytes.buffer,
      headers: new Headers({ 'content-type': 'image/jpeg' }),
    })
    global.fetch = fetchSpy as unknown as typeof fetch

    const result = await fetchLogoBytes(
      'https://anotherproject.supabase.co/storage/v1/object/public/tenant-assets/t/logo.jpg',
    )
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(result?.bytes).toEqual(fakeBytes)
    expect(result?.mimeType).toBe('image/jpeg')
  })

  it('returns null from fetchLogoBytes for malformed URLs', async () => {
    const result = await fetchLogoBytes('not a url at all')
    expect(result).toBeNull()
  })
})
