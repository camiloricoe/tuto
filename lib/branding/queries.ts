import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

// Audit action constant — used by Settings UI agent when wiring updateBranding into a server action
export const AUDIT_ACTION_BRANDING_UPDATE = 'branding.update'

export type TenantBranding =
  Database['public']['Tables']['tenant_branding']['Row']

export async function getBrandingByTenantId(
  tenantId: string,
): Promise<TenantBranding | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tenant_branding')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getBrandingBySubdomain(subdomain: string): Promise<{
  tenant: { id: string; name: string; subdomain: string }
  branding: TenantBranding
} | null> {
  const supabase = await createClient()
  // Use the tenants_public view — anon-accessible, exposes only safe columns
  // (id, name, subdomain, custom_domain, active). Login page needs branding pre-auth.
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants_public')
    .select('id, name, subdomain')
    .eq('subdomain', subdomain)
    .maybeSingle()

  if (tenantError) throw tenantError
  // View columns are nullable in generated types even though the underlying
  // table columns are NOT NULL — narrow here.
  if (!tenant || !tenant.id || !tenant.name || !tenant.subdomain) return null
  const safeTenant = { id: tenant.id, name: tenant.name, subdomain: tenant.subdomain }

  const { data: branding, error: brandingError } = await supabase
    .from('tenant_branding')
    .select('*')
    .eq('tenant_id', safeTenant.id)
    .maybeSingle()

  if (brandingError) throw brandingError
  if (!branding) return null

  return { tenant: safeTenant, branding }
}

export async function updateBranding(
  tenantId: string,
  patch: Partial<
    Omit<TenantBranding, 'tenant_id' | 'created_at' | 'updated_at'>
  >,
): Promise<TenantBranding> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tenant_branding')
    .update(patch)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) throw error
  return data
}
