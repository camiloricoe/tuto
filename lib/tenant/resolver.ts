import 'server-only'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export type HostnameContext = {
  subdomain: string | null
  isApex: boolean
  isLocalhost: boolean
  isVercelPreview: boolean
  apexDomain: string
}

export type ResolvedTenant = {
  tenantId: string
  name: string
  subdomain: string
  source: 'subdomain' | 'custom_domain'
}

const PRODUCTION_APEX = 'creadigitalagency.com'

const APEX_HOSTNAMES = new Set([
  'creadigitalagency.com',
  'www.creadigitalagency.com',
  'tuto-flame.vercel.app',
])

export function parseHostname(host: string | null | undefined): HostnameContext {
  const defaults: HostnameContext = {
    subdomain: null,
    isApex: false,
    isLocalhost: false,
    isVercelPreview: false,
    apexDomain: PRODUCTION_APEX,
  }

  if (!host) return defaults

  const hostname = (host.split(':')[0] ?? '').toLowerCase()

  if (!hostname) return defaults

  // localhost variants
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local')
  ) {
    const subdomain: string | null =
      hostname.endsWith('.localhost') || hostname.endsWith('.local')
        ? (hostname.split('.')[0] ?? null)
        : null
    return { ...defaults, isLocalhost: true, subdomain }
  }

  // Vercel preview deploys (*.vercel.app)
  if (hostname.endsWith('.vercel.app')) {
    return { ...defaults, isVercelPreview: true, isApex: true }
  }

  // Exact apex hostnames
  if (APEX_HOSTNAMES.has(hostname)) {
    return { ...defaults, isApex: true, apexDomain: PRODUCTION_APEX }
  }

  // Subdomain of production apex (e.g. indecap.creadigitalagency.com)
  if (hostname.endsWith(`.${PRODUCTION_APEX}`)) {
    const sub = hostname.slice(0, hostname.length - `.${PRODUCTION_APEX}`.length)
    // Reject multi-level subdomains (e.g. a.b.creadigitalagency.com)
    if (!sub.includes('.')) {
      return { ...defaults, subdomain: sub, isApex: false }
    }
  }

  // Unknown domain — treat as custom domain candidate (subdomain null, full host used by resolver)
  return { ...defaults, apexDomain: hostname }
}

// Internal DB fetch — isolated so it's easy to swap when Agent A lands columns.
// NOTE: `subdomain` and `custom_domain` columns are added by Agent A's migration.
// Until that migration runs, queries against these columns will fail with a Postgres error.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchTenantBySubdomain(subdomain: string): Promise<ResolvedTenant | null> {
  const supabase = createAdminClient()
  // Cast to any because Agent A's columns (subdomain, custom_domain) aren't in
  // database.types.ts yet — they will be after Agent A regenerates types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('tenants')
    .select('id, name, subdomain')
    .eq('subdomain', subdomain)
    .eq('active', true)
    .single()

  if (error || !data) return null

  return {
    tenantId: data.id as string,
    name: data.name as string,
    subdomain: data.subdomain as string,
    source: 'subdomain',
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchTenantByCustomDomain(fullHost: string): Promise<ResolvedTenant | null> {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('tenants')
    .select('id, name, subdomain, custom_domain')
    .eq('custom_domain', fullHost)
    .eq('active', true)
    .single()

  if (error || !data) return null

  return {
    tenantId: data.id as string,
    name: data.name as string,
    subdomain: data.subdomain as string,
    source: 'custom_domain',
  }
}

function makeCachedSubdomainFetch(subdomain: string) {
  return unstable_cache(
    () => fetchTenantBySubdomain(subdomain),
    ['tenant-resolve', subdomain],
    {
      tags: [`tenant-resolve:${subdomain}`],
      revalidate: 300,
    },
  )
}

function makeCachedCustomDomainFetch(fullHost: string) {
  return unstable_cache(
    () => fetchTenantByCustomDomain(fullHost),
    ['tenant-resolve', fullHost],
    {
      tags: [`tenant-resolve:${fullHost}`],
      revalidate: 300,
    },
  )
}

export async function resolveTenant(host: string | null | undefined): Promise<ResolvedTenant | null> {
  try {
    const ctx = parseHostname(host)

    // Apex, localhost, and Vercel preview with no subdomain → no tenant context
    if ((ctx.isApex || ctx.isLocalhost || ctx.isVercelPreview) && !ctx.subdomain) {
      return null
    }

    if (ctx.subdomain) {
      return await makeCachedSubdomainFetch(ctx.subdomain)()
    }

    // Custom domain: apexDomain holds the full hostname when no known pattern matched
    const fullHost = (host!.split(':')[0] ?? '').toLowerCase()
    return await makeCachedCustomDomainFetch(fullHost)()
  } catch (err) {
    console.error('[tenant-resolver] Error resolving tenant for host:', host, err)
    return null
  }
}
