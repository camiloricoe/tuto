import 'server-only'
import { getBrandingByTenantId } from '@/lib/branding/queries'
import { hslStringToHex } from '@/lib/branding/colors'

/**
 * Resolved branding context for PDF rendering.
 *
 * Always returns a complete record — falls back to TUTO defaults when the
 * tenant has no branding row, no logo, or invalid color values. This keeps
 * PDF rendering deterministic and prevents missing branding from breaking
 * receipt / report generation.
 */
export type PdfBranding = {
  logoBytes: Uint8Array | null
  logoMimeType: string | null
  primaryHex: string
  accentHex: string
  tenantName: string
  supportEmail: string | null
  supportUrl: string | null
}

const DEFAULT_PRIMARY_HEX = '#1a1a1a'
const DEFAULT_ACCENT_HEX = '#555555'
const DEFAULT_TENANT_NAME = 'TUTO'

const LOGO_FETCH_TIMEOUT_MS = 5_000
const LOGO_MAX_BYTES = 2 * 1024 * 1024 // 2 MB safety ceiling
const LOGO_CACHE_MAX_ENTRIES = 64

type LogoCacheEntry = {
  bytes: Uint8Array
  mimeType: string
}

// Module-scoped in-memory cache. Keyed by logo URL. Bounded with simple
// FIFO eviction once size exceeds LOGO_CACHE_MAX_ENTRIES so a malicious or
// runaway tenant churn can't grow memory unboundedly.
const logoCache = new Map<string, LogoCacheEntry>()

function cacheLogo(url: string, entry: LogoCacheEntry): void {
  if (logoCache.size >= LOGO_CACHE_MAX_ENTRIES) {
    const firstKey = logoCache.keys().next().value
    if (firstKey !== undefined) logoCache.delete(firstKey)
  }
  logoCache.set(url, entry)
}

/**
 * Validate that a logo URL is HTTPS and points at the configured Supabase
 * project (or a `*.supabase.co` host as a safe default). Returns the parsed
 * URL on success, `null` otherwise.
 *
 * This guards against tenants smuggling arbitrary external URLs into the
 * PDF pipeline (SSRF / data-exfil vectors).
 */
function validateLogoUrl(rawUrl: string): URL | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null

  const host = url.hostname.toLowerCase()

  // Allow the configured project host explicitly when available.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (supabaseUrl) {
    try {
      const expectedHost = new URL(supabaseUrl).hostname.toLowerCase()
      if (host === expectedHost) return url
    } catch {
      // fall through to the generic supabase.co check
    }
  }

  // Generic safety net: any *.supabase.co host.
  if (host === 'supabase.co' || host.endsWith('.supabase.co')) return url

  return null
}

function inferMimeType(url: URL, headerType: string | null): string {
  if (headerType) {
    const lower = headerType.toLowerCase()
    if (lower.startsWith('image/')) return lower.split(';')[0]!.trim()
  }
  const path = url.pathname.toLowerCase()
  if (path.endsWith('.png')) return 'image/png'
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg'
  if (path.endsWith('.gif')) return 'image/gif'
  if (path.endsWith('.webp')) return 'image/webp'
  return 'image/png'
}

/**
 * Fetch a tenant logo as raw bytes with cache + safety guards.
 * Exported for use by `resolveBrandingForPdf` and tests.
 */
export async function fetchLogoBytes(
  logoUrl: string,
): Promise<LogoCacheEntry | null> {
  const validated = validateLogoUrl(logoUrl)
  if (!validated) return null

  const cached = logoCache.get(logoUrl)
  if (cached) return cached

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LOGO_FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(validated.toString(), { signal: controller.signal })
    if (!res.ok) return null

    const buf = await res.arrayBuffer()
    if (buf.byteLength === 0 || buf.byteLength > LOGO_MAX_BYTES) return null

    const bytes = new Uint8Array(buf)
    const mimeType = inferMimeType(validated, res.headers.get('content-type'))
    const entry: LogoCacheEntry = { bytes, mimeType }
    cacheLogo(logoUrl, entry)
    return entry
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Test helper — reset the in-memory logo cache between unit tests. Not
 * intended for application code. Safe to call any time.
 */
export function _resetLogoCacheForTests(): void {
  logoCache.clear()
}

/**
 * Resolve branding for a tenant into the shape the PDF templates expect.
 *
 * - Looks up branding via `getBrandingByTenantId`.
 * - Fetches the logo (HTTPS + Supabase host only, 5s timeout, in-memory cache).
 * - Converts HSL strings to hex; falls back to TUTO defaults if missing/invalid.
 * - Returns the tenant name (preferring branding `email_from_name`, otherwise
 *   a caller-supplied default).
 *
 * Never throws — branding is a non-critical render concern. If any branding
 * lookup fails, the result falls back cleanly to defaults so receipts /
 * reports always render.
 */
export async function resolveBrandingForPdf(
  tenantId: string,
  fallbackTenantName: string = DEFAULT_TENANT_NAME,
): Promise<PdfBranding> {
  let branding: Awaited<ReturnType<typeof getBrandingByTenantId>> = null
  try {
    branding = await getBrandingByTenantId(tenantId)
  } catch {
    branding = null
  }

  const primaryHex =
    hslStringToHex(branding?.primary_hsl ?? null) ?? DEFAULT_PRIMARY_HEX
  const accentHex =
    hslStringToHex(branding?.accent_hsl ?? null) ?? DEFAULT_ACCENT_HEX

  const tenantName =
    branding?.email_from_name?.trim() ||
    fallbackTenantName.trim() ||
    DEFAULT_TENANT_NAME

  let logoBytes: Uint8Array | null = null
  let logoMimeType: string | null = null
  if (branding?.logo_url) {
    const entry = await fetchLogoBytes(branding.logo_url)
    if (entry) {
      logoBytes = entry.bytes
      logoMimeType = entry.mimeType
    }
  }

  return {
    logoBytes,
    logoMimeType,
    primaryHex,
    accentHex,
    tenantName,
    supportEmail: branding?.support_email ?? null,
    supportUrl: branding?.support_url ?? null,
  }
}
