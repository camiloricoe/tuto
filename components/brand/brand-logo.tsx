import 'server-only'
import { getCurrentBranding, getCurrentTenant } from './tenant-context'

const ALLOWED_HOSTS_SUFFIX = ['.supabase.co', '.supabase.in']

function isSafeLogoUrl(url: string | null | undefined): url is string {
  if (!url) return false
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') return false
  const host = parsed.hostname.toLowerCase()
  return ALLOWED_HOSTS_SUFFIX.some((suffix) => host.endsWith(suffix))
}

const SIZE_MAP = {
  sm: { width: 96, height: 32, textClass: 'text-base' },
  md: { width: 144, height: 48, textClass: 'text-xl' },
  lg: { width: 216, height: 72, textClass: 'text-3xl' },
} as const

export type BrandLogoSize = keyof typeof SIZE_MAP

export type BrandLogoProps = {
  size?: BrandLogoSize
  className?: string
  /**
   * Optional fallback label (used when no logo and no tenant). Defaults to
   * the resolved tenant name, falling back to "TUTO".
   */
  fallback?: string
  /**
   * Optional explicit logo URL. When provided, the resolver is bypassed and
   * this URL is rendered directly (after the same HTTPS+supabase host
   * validation). Use this when the hostname-based resolver cannot find the
   * active tenant — e.g. a super admin on apex who has switched into a
   * tenant via cookie. Pair with `alt` to control the alt text in that case.
   */
  url?: string | null
  /**
   * Optional explicit alt text. Defaults to the resolved tenant name, then
   * `fallback`, then "TUTO".
   */
  alt?: string
}

/**
 * Renders the tenant's logo image when available, otherwise a textual brand
 * mark. Plain `<img>` (not `next/image`) so we don't need to allowlist the
 * supabase storage origin in `next.config.ts` — we already validate the URL
 * matches a known supabase host.
 */
export async function BrandLogo({
  size = 'md',
  className,
  fallback,
  url,
  alt,
}: BrandLogoProps) {
  const { width, height, textClass } = SIZE_MAP[size]

  // Explicit `url` bypasses the per-request hostname resolver. This is the
  // path used by apex super admins who have switched into a tenant via the
  // active-tenant cookie — the hostname is apex but we already know which
  // tenant they're operating on.
  if (url !== undefined) {
    const altLabel = alt ?? fallback ?? 'TUTO'
    if (isSafeLogoUrl(url)) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={altLabel}
          width={width}
          height={height}
          className={className}
          style={{ objectFit: 'contain' }}
          data-brand-logo=""
        />
      )
    }
    return (
      <span
        data-brand-logo-text=""
        className={`inline-flex items-center font-semibold tracking-tight ${textClass}${className ? ` ${className}` : ''}`}
        style={{ minHeight: height }}
      >
        {altLabel}
      </span>
    )
  }

  const branding = await getCurrentBranding()
  const tenant = await getCurrentTenant()
  const altLabel = alt ?? tenant?.name ?? fallback ?? 'TUTO'

  if (isSafeLogoUrl(branding?.logo_url)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={branding!.logo_url!}
        alt={altLabel}
        width={width}
        height={height}
        className={className}
        style={{ objectFit: 'contain' }}
        data-brand-logo=""
      />
    )
  }

  const label = fallback ?? tenant?.name ?? 'TUTO'
  return (
    <span
      data-brand-logo-text=""
      className={`inline-flex items-center font-semibold tracking-tight ${textClass}${className ? ` ${className}` : ''}`}
      style={{ minHeight: height }}
    >
      {label}
    </span>
  )
}
