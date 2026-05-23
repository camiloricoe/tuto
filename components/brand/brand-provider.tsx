import 'server-only'
import { getCurrentBranding } from './tenant-context'
import type { TenantBranding } from '@/lib/branding/queries'

/**
 * Strict HSL pattern accepted from the DB / settings UI.
 *
 * Tailwind/shadcn style: three space-separated tokens "H S% L%", where:
 *   - H is 0-360 (integer or 1 decimal)
 *   - S is 0-100 with required percent sign
 *   - L is 0-100 with required percent sign
 *
 * Anything else is rejected to prevent CSS injection via the `<style>` block
 * (e.g. `red; } body { background: url(evil) }`).
 */
const HSL_RE = /^\d{1,3}(\.\d+)?\s+\d{1,3}(\.\d+)?%\s+\d{1,3}(\.\d+)?%$/

/**
 * Hosts permitted for favicon URLs. Logos are rendered via the `BrandLogo`
 * component (which performs its own validation); favicons are injected into
 * `<head>` here and so are validated locally.
 */
const ALLOWED_HOSTS_SUFFIX = ['.supabase.co', '.supabase.in']

function isSafeHttpsUrl(url: string | null | undefined): url is string {
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

function sanitizeHsl(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!HSL_RE.test(trimmed)) return null
  return trimmed
}

export type BrandStyleProps = {
  branding: TenantBranding | null
}

/**
 * Pure renderer — exported for unit testing. Returns `null` when there is no
 * branding or no valid values (default theme from `globals.css` takes over).
 */
export function BrandStyle({ branding }: BrandStyleProps) {
  if (!branding) return null

  const primary = sanitizeHsl(branding.primary_hsl)
  const accent = sanitizeHsl(branding.accent_hsl)

  if (!primary && !accent) return null

  // Build a tiny CSS rule. Only sanitized values are interpolated — we never
  // pass through user input that hasn't matched HSL_RE.
  const decls: string[] = []
  if (primary) {
    decls.push(`--brand-primary: ${primary};`)
    // Tailwind v4 reads `--color-primary` / `--color-ring` from `@theme`.
    // Wrap the validated HSL triplet in `hsl(...)` so utilities pick it up.
    decls.push(`--color-primary: hsl(${primary});`)
    decls.push(`--color-ring: hsl(${primary});`)
  }
  if (accent) {
    decls.push(`--brand-accent: ${accent};`)
    decls.push(`--color-accent: hsl(${accent} / 0.15);`)
    decls.push(`--color-accent-foreground: hsl(${accent});`)
  }

  const css = `:root{${decls.join('')}}`
  return (
    <style
      data-brand-vars=""
      // Safe: every value has been validated with a strict regex.
      dangerouslySetInnerHTML={{ __html: css }}
    />
  )
}

export type BrandFaviconProps = {
  branding: TenantBranding | null
}

export function BrandFavicon({ branding }: BrandFaviconProps) {
  const url = branding?.favicon_url
  if (!isSafeHttpsUrl(url)) return null
  return <link rel="icon" href={url} data-brand-favicon="" />
}

/**
 * Server component. Reads the current tenant's branding (per-request cached)
 * and emits a `<style>` tag plus optional `<link rel="icon">`. Render this in
 * the document `<head>` (or as the first child of `<body>`) so the variables
 * are present before any children paint — eliminates FOUC.
 *
 * Apex / unknown hosts → renders nothing, default TUTO theme applies.
 */
export async function BrandProvider() {
  const branding = await getCurrentBranding()
  return (
    <>
      <BrandStyle branding={branding} />
      <BrandFavicon branding={branding} />
    </>
  )
}

// Re-exports for tests that want to bypass the async data fetch.
export { sanitizeHsl, isSafeHttpsUrl }
