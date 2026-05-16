import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

// These tests use the ANON key (not service role) to verify RLS prevents
// public reads of tenant-scoped data. They run against the configured
// Supabase URL and should be safe even on production.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://hmytbrsgbrnwtvzfyffb.supabase.co'
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_V0KmktfDGeVfl56xwwpB1A_vYQty2OM'

const skip = !url || !anonKey
const itIfReachable = skip ? it.skip : it

describe('RLS — anon client cannot read sensitive tables', () => {
  let anon: SupabaseClient<Database>

  beforeAll(() => {
    anon = createClient(url, anonKey, { auth: { persistSession: false } })
  })

  itIfReachable('cannot list tenants with no auth', async () => {
    const { data, error } = await anon.from('tenants').select('id, name').limit(5)
    // Either RLS denies (data is empty/null) or error returned. Crucially: no data leaks.
    if (data) expect(data.length).toBe(0)
    if (error) expect(error.message).toMatch(/permission|policy|denied|row-level/i)
  })

  itIfReachable('cannot list user_profiles with no auth', async () => {
    const { data, error } = await anon.from('user_profiles').select('id, full_name').limit(5)
    if (data) expect(data.length).toBe(0)
    if (error) expect(error.message).toMatch(/permission|policy|denied|row-level/i)
  })

  itIfReachable('cannot list payments with no auth', async () => {
    const { data, error } = await anon.from('payments').select('id, amount').limit(5)
    if (data) expect(data.length).toBe(0)
    if (error) expect(error.message).toMatch(/permission|policy|denied|row-level/i)
  })

  itIfReachable('cannot list grades with no auth', async () => {
    const { data, error } = await anon.from('grades').select('id, value').limit(5)
    if (data) expect(data.length).toBe(0)
    if (error) expect(error.message).toMatch(/permission|policy|denied|row-level/i)
  })

  itIfReachable('cannot list activity_log with no auth', async () => {
    const { data, error } = await anon.from('activity_log').select('id').limit(5)
    if (data) expect(data.length).toBe(0)
    if (error) expect(error.message).toMatch(/permission|policy|denied|row-level/i)
  })

  itIfReachable('cannot list feedback_tickets with no auth', async () => {
    const { data, error } = await anon.from('feedback_tickets').select('id, title').limit(5)
    if (data) expect(data.length).toBe(0)
    if (error) expect(error.message).toMatch(/permission|policy|denied|row-level/i)
  })

  itIfReachable('cannot list platform_test_runs with no auth', async () => {
    const { data, error } = await anon.from('platform_test_runs').select('id').limit(5)
    if (data) expect(data.length).toBe(0)
    if (error) expect(error.message).toMatch(/permission|policy|denied|row-level/i)
  })

  itIfReachable('cannot insert into tenants with no auth', async () => {
    const { error } = await anon
      .from('tenants')
      .insert({ name: 'Pwn', slug: 'pwn', subdomain: 'pwn-attempt' })
    expect(error).toBeTruthy()
  })

  itIfReachable('auth.users table is not exposed to PostgREST', async () => {
    // The auth schema is not exposed; querying a non-existent public table
    // should fail with "relation not found" or permission denied.
    // Cast to bypass type safety — we are intentionally querying an invalid table name.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (anon as any).from('users').select('id').limit(1)
    if (data) expect(data.length).toBe(0)
    if (error) expect(error.message).toMatch(/permission|does not exist|relation|could not find/i)
  })
})
