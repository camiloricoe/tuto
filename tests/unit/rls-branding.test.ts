import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

// Tests for tenant_branding and tenant-assets storage RLS.
// Uses the anon key to verify public-read is allowed but writes are blocked.

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://hmytbrsgbrnwtvzfyffb.supabase.co'
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_V0KmktfDGeVfl56xwwpB1A_vYQty2OM'

const skip = !url || !anonKey
const itIfReachable = skip ? it.skip : it

describe('RLS — tenant_branding and tenant-assets storage', () => {
  let anon: SupabaseClient<Database>

  beforeAll(() => {
    anon = createClient<Database>(url, anonKey, { auth: { persistSession: false } })
  })

  itIfReachable('anon client CAN read tenant_branding rows (intentional for login pages)', async () => {
    const { data, error } = await anon
      .from('tenant_branding')
      .select('tenant_id, primary_hsl')
      .limit(5)

    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  itIfReachable('anon client CANNOT write to tenant_branding', async () => {
    const { data: rows } = await anon
      .from('tenant_branding')
      .select('tenant_id, login_message')
      .limit(1)

    if (!rows || rows.length === 0) {
      // No rows — insert path: must error or return no data
      const { data: inserted, error: insertError } = await anon
        .from('tenant_branding')
        .insert({ tenant_id: '00000000-0000-0000-0000-000000000000' })
        .select()
      expect(insertError || !inserted || inserted.length === 0).toBeTruthy()
      return
    }

    const firstRow = rows[0]
    if (!firstRow) return

    // UPDATE with no matching policy returns empty data (RLS silently filters rows),
    // not an error. Verify by .select()ing the result — should be empty.
    const { data: updated } = await anon
      .from('tenant_branding')
      .update({ login_message: 'pwned-by-anon' })
      .eq('tenant_id', firstRow.tenant_id)
      .select()

    expect(updated == null || updated.length === 0).toBe(true)

    // Double-check: the row's login_message should NOT have changed
    const { data: after } = await anon
      .from('tenant_branding')
      .select('login_message')
      .eq('tenant_id', firstRow.tenant_id)
      .single()
    expect(after?.login_message ?? null).not.toBe('pwned-by-anon')
  })

  itIfReachable('anon client CANNOT upload to tenant-assets bucket', async () => {
    // Use Uint8Array (Node-native) instead of Blob to avoid environment quirks
    const bytes = new TextEncoder().encode('test-content')
    let blocked = false
    let errMsg: string | undefined
    try {
      const { error } = await anon.storage
        .from('tenant-assets')
        .upload(
          `00000000-0000-0000-0000-000000000000/anon-block-${Date.now()}.txt`,
          bytes,
          { contentType: 'text/plain', upsert: false },
        )
      if (error) {
        blocked = true
        errMsg = error.message
      }
    } catch (e) {
      blocked = true
      errMsg = (e as Error)?.message ?? String(e)
    }
    expect(blocked, `Upload should be blocked by RLS for anon. errMsg=${errMsg ?? '<none>'}`).toBe(true)
  })

  itIfReachable('anon client CAN list/read public objects from tenant-assets (intentional)', async () => {
    // Public bucket — listing objects should not throw an auth error
    const { data, error } = await anon.storage
      .from('tenant-assets')
      .list('', { limit: 5 })

    // Either succeeds with data or returns empty — but should not fail with auth/RLS error
    if (error) {
      // Bucket may be empty or listing may not be allowed but reads via URL are public
      // The key assertion: it should NOT be a permissions/auth error for the bucket itself
      expect(error.message).not.toMatch(/not authorized|forbidden|permission/i)
    } else {
      expect(Array.isArray(data)).toBe(true)
    }
  })
})
