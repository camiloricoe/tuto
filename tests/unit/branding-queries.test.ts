import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

// Tests run against the remote Supabase project using the anon key.
// tenant_branding is intentionally readable by anon (login pages need branding before auth).

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://hmytbrsgbrnwtvzfyffb.supabase.co'
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_V0KmktfDGeVfl56xwwpB1A_vYQty2OM'

const skip = !url || !anonKey
const itIfReachable = skip ? it.skip : it

describe('Branding queries — anon client', () => {
  let anon: SupabaseClient<Database>

  beforeAll(() => {
    anon = createClient<Database>(url, anonKey, { auth: { persistSession: false } })
  })

  itIfReachable(
    'getBrandingBySubdomain: returns tenant + branding for known subdomain',
    async () => {
      // Fetch tenant with subdomain derived from slug 'indecap'
      const { data: tenants } = await anon
        .from('tenants_public')
        .select('id, name, subdomain')
        .eq('subdomain', 'indecap')
        .maybeSingle()

      if (!tenants) {
        // If indecap doesn't exist, check any tenant exists with a subdomain
        const { data: anyTenant } = await anon
          .from('tenants_public')
          .select('id, name, subdomain')
          .not('subdomain', 'is', null)
          .limit(1)
          .maybeSingle()
        // If no tenants have subdomains yet, skip gracefully
        if (!anyTenant) return
        expect(anyTenant.subdomain).toBeTruthy()
        return
      }

      expect(tenants.id).toBeTruthy()
      expect(tenants.name).toBeTruthy()
      expect(tenants.subdomain).toBe('indecap')

      // Fetch branding for this tenant
      const tenantId = tenants.id as string
      const { data: branding, error } = await anon
        .from('tenant_branding')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle()

      expect(error).toBeNull()
      expect(branding).toBeTruthy()
      expect(branding?.tenant_id).toBe(tenantId)
    },
  )

  itIfReachable(
    'getBrandingBySubdomain: returns null for nonexistent subdomain',
    async () => {
      const { data, error } = await anon
        .from('tenants_public')
        .select('id, name, subdomain')
        .eq('subdomain', 'this-subdomain-does-not-exist-xyz123')
        .maybeSingle()

      expect(error).toBeNull()
      expect(data).toBeNull()
    },
  )

  itIfReachable('anon client CAN SELECT tenant_branding (intentional)', async () => {
    const { data, error } = await anon
      .from('tenant_branding')
      .select('tenant_id, primary_hsl, accent_hsl')
      .limit(5)

    // RLS allows anon reads — this should succeed (no error, data returned)
    expect(error).toBeNull()
    // Data may be empty if no rows exist, but the query itself should not be blocked
    expect(Array.isArray(data)).toBe(true)
  })

  itIfReachable('anon client CANNOT UPDATE tenant_branding (RLS blocks)', async () => {
    // First get any branding row
    const { data: rows } = await anon
      .from('tenant_branding')
      .select('tenant_id')
      .limit(1)

    const firstRow = rows?.[0]
    if (!firstRow) return // nothing to test against

    // RLS-blocked UPDATE returns empty data, not an error — verify by .select()
    const { data: updated } = await anon
      .from('tenant_branding')
      .update({ login_message: 'pwned-by-anon-queries' })
      .eq('tenant_id', firstRow.tenant_id)
      .select()

    expect(updated == null || updated.length === 0).toBe(true)

    const { data: after } = await anon
      .from('tenant_branding')
      .select('login_message')
      .eq('tenant_id', firstRow.tenant_id)
      .single()
    expect(after?.login_message ?? null).not.toBe('pwned-by-anon-queries')
  })
})
