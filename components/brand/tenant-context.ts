import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import { resolveTenant, type ResolvedTenant } from '@/lib/tenant/resolver'
import {
  getBrandingByTenantId,
  type TenantBranding,
} from '@/lib/branding/queries'

/**
 * Per-request memoized helpers for reading the current tenant and its branding.
 *
 * Implementation: these are wrapped in React `cache()` so that within a single
 * request, calling them multiple times only runs the underlying work once.
 * Combined with `unstable_cache` inside `resolveTenant`, the first call may
 * touch the DB; subsequent calls in the same request are free.
 *
 * Apex / localhost / Vercel preview return `null` for `getCurrentTenant()`,
 * and `null` for `getCurrentBranding()` accordingly. Callers must handle the
 * null case and fall back to the default TUTO theme/strings.
 */

async function _getCurrentTenant(): Promise<ResolvedTenant | null> {
  try {
    const h = await headers()
    const host = h.get('host')
    return await resolveTenant(host)
  } catch (err) {
    console.error('[tenant-context] getCurrentTenant failed', err)
    return null
  }
}

async function _getCurrentBranding(): Promise<TenantBranding | null> {
  const tenant = await getCurrentTenant()
  if (!tenant) return null
  try {
    return await getBrandingByTenantId(tenant.tenantId)
  } catch (err) {
    console.error('[tenant-context] getCurrentBranding failed', err)
    return null
  }
}

export const getCurrentTenant = cache(_getCurrentTenant)
export const getCurrentBranding = cache(_getCurrentBranding)
