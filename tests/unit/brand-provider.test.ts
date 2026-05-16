import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  BrandStyle,
  BrandFavicon,
  sanitizeHsl,
  isSafeHttpsUrl,
} from '@/components/brand/brand-provider'
import type { TenantBranding } from '@/lib/branding/queries'

// server-only is aliased to an empty stub by vitest.config — nothing to mock.

// Mock the supabase server client because the queries module pulls it in via
// the re-export chain (TenantBranding type only). It shouldn't be invoked
// because BrandStyle / BrandFavicon are pure renderers, but the import graph
// touches it.
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({}),
}))

function makeBranding(overrides: Partial<TenantBranding>): TenantBranding {
  return {
    tenant_id: 't1',
    accent_hsl: null,
    primary_hsl: null,
    logo_url: null,
    logo_storage_path: null,
    favicon_url: null,
    favicon_storage_path: null,
    login_message: null,
    login_background_url: null,
    email_from_name: null,
    email_reply_to: null,
    support_email: null,
    support_url: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('sanitizeHsl', () => {
  it('accepts valid HSL', () => {
    expect(sanitizeHsl('221 83% 53%')).toBe('221 83% 53%')
    expect(sanitizeHsl('0 0% 100%')).toBe('0 0% 100%')
    expect(sanitizeHsl('200.5 50.2% 40.1%')).toBe('200.5 50.2% 40.1%')
  })

  it('trims whitespace', () => {
    expect(sanitizeHsl('  221 83% 53%  ')).toBe('221 83% 53%')
  })

  it('rejects empty / null', () => {
    expect(sanitizeHsl(null)).toBeNull()
    expect(sanitizeHsl('')).toBeNull()
    expect(sanitizeHsl('   ')).toBeNull()
  })

  it('rejects CSS injection attempts', () => {
    expect(sanitizeHsl('red; } body { background: url(/evil)')).toBeNull()
    expect(sanitizeHsl('221 83% 53%; --x: bad')).toBeNull()
    expect(sanitizeHsl('</style><script>alert(1)</script>')).toBeNull()
    expect(sanitizeHsl('expression(evil())')).toBeNull()
  })

  it('rejects malformed HSL', () => {
    expect(sanitizeHsl('221, 83%, 53%')).toBeNull()
    expect(sanitizeHsl('hsl(221, 83%, 53%)')).toBeNull()
    expect(sanitizeHsl('221 83 53')).toBeNull()
    expect(sanitizeHsl('#fff')).toBeNull()
  })
})

describe('isSafeHttpsUrl', () => {
  it('accepts https supabase URLs', () => {
    expect(
      isSafeHttpsUrl('https://hmytbrsgbrnwtvzfyffb.supabase.co/storage/v1/foo.png'),
    ).toBe(true)
  })

  it('rejects http (non-https)', () => {
    expect(isSafeHttpsUrl('http://hmytbrsgbrnwtvzfyffb.supabase.co/x.png')).toBe(false)
  })

  it('rejects arbitrary hosts', () => {
    expect(isSafeHttpsUrl('https://evil.com/logo.png')).toBe(false)
    expect(isSafeHttpsUrl('https://supabase.co.evil.com/x.png')).toBe(false)
  })

  it('rejects malformed urls', () => {
    expect(isSafeHttpsUrl('not a url')).toBe(false)
    expect(isSafeHttpsUrl(null)).toBe(false)
    expect(isSafeHttpsUrl(undefined)).toBe(false)
    expect(isSafeHttpsUrl('')).toBe(false)
  })
})

describe('BrandStyle', () => {
  it('renders nothing when branding is null', () => {
    const html = renderToStaticMarkup(BrandStyle({ branding: null }))
    expect(html).toBe('')
  })

  it('renders nothing when no valid color values are present', () => {
    const branding = makeBranding({ primary_hsl: null, accent_hsl: null })
    const html = renderToStaticMarkup(BrandStyle({ branding }))
    expect(html).toBe('')
  })

  it('renders --brand-primary, --primary, --ring when primary_hsl set', () => {
    const branding = makeBranding({ primary_hsl: '221 83% 53%' })
    const html = renderToStaticMarkup(BrandStyle({ branding }))
    expect(html).toContain('<style')
    expect(html).toContain('--brand-primary: 221 83% 53%')
    expect(html).toContain('--primary: 221 83% 53%')
    expect(html).toContain('--ring: 221 83% 53%')
  })

  it('renders --brand-accent when accent_hsl set', () => {
    const branding = makeBranding({ accent_hsl: '180 50% 40%' })
    const html = renderToStaticMarkup(BrandStyle({ branding }))
    expect(html).toContain('--brand-accent: 180 50% 40%')
  })

  it('renders both primary and accent vars when both set', () => {
    const branding = makeBranding({
      primary_hsl: '221 83% 53%',
      accent_hsl: '180 50% 40%',
    })
    const html = renderToStaticMarkup(BrandStyle({ branding }))
    expect(html).toContain('--brand-primary: 221 83% 53%')
    expect(html).toContain('--brand-accent: 180 50% 40%')
  })

  it('skips injection attempts in primary_hsl (no XSS)', () => {
    const branding = makeBranding({
      primary_hsl: '221 83% 53%; } body { background: url(/evil) } /*',
      accent_hsl: null,
    })
    const html = renderToStaticMarkup(BrandStyle({ branding }))
    // Value was invalid -> nothing rendered
    expect(html).toBe('')
  })

  it('skips </style> escape attempts', () => {
    const branding = makeBranding({
      primary_hsl: '</style><script>alert(1)</script>',
    })
    const html = renderToStaticMarkup(BrandStyle({ branding }))
    expect(html).toBe('')
    expect(html).not.toContain('<script>')
  })

  it('keeps valid primary even if accent is malicious', () => {
    const branding = makeBranding({
      primary_hsl: '221 83% 53%',
      accent_hsl: 'evil; }',
    })
    const html = renderToStaticMarkup(BrandStyle({ branding }))
    expect(html).toContain('--brand-primary: 221 83% 53%')
    expect(html).not.toContain('evil')
    expect(html).not.toContain('--brand-accent')
  })
})

describe('BrandFavicon', () => {
  it('renders nothing when no branding', () => {
    const html = renderToStaticMarkup(BrandFavicon({ branding: null }))
    expect(html).toBe('')
  })

  it('renders nothing when no favicon_url', () => {
    const branding = makeBranding({ favicon_url: null })
    const html = renderToStaticMarkup(BrandFavicon({ branding }))
    expect(html).toBe('')
  })

  it('renders link with safe supabase https URL', () => {
    const branding = makeBranding({
      favicon_url: 'https://hmytbrsgbrnwtvzfyffb.supabase.co/storage/v1/x.ico',
    })
    const html = renderToStaticMarkup(BrandFavicon({ branding }))
    expect(html).toContain('rel="icon"')
    expect(html).toContain('https://hmytbrsgbrnwtvzfyffb.supabase.co/storage/v1/x.ico')
  })

  it('rejects untrusted host', () => {
    const branding = makeBranding({ favicon_url: 'https://evil.com/x.ico' })
    const html = renderToStaticMarkup(BrandFavicon({ branding }))
    expect(html).toBe('')
  })

  it('rejects http (non-https)', () => {
    const branding = makeBranding({
      favicon_url: 'http://hmytbrsgbrnwtvzfyffb.supabase.co/x.ico',
    })
    const html = renderToStaticMarkup(BrandFavicon({ branding }))
    expect(html).toBe('')
  })
})
