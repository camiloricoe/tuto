import 'server-only'
import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_TERMS, TERM_KEYS, type TenantTerms, type TermKey } from './defaults'

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function mergeTerms(raw: unknown): TenantTerms {
  if (!isRecord(raw)) return DEFAULT_TERMS
  const out = { ...DEFAULT_TERMS }
  for (const key of TERM_KEYS) {
    const incoming = raw[key]
    if (!isRecord(incoming)) continue
    const singular = typeof incoming.singular === 'string' ? incoming.singular.trim() : ''
    const plural = typeof incoming.plural === 'string' ? incoming.plural.trim() : ''
    out[key as TermKey] = {
      singular: singular || DEFAULT_TERMS[key].singular,
      plural: plural || DEFAULT_TERMS[key].plural,
    }
  }
  return out
}

export const getTenantTerms = cache(async (tenantId: string | null): Promise<TenantTerms> => {
  if (!tenantId) return DEFAULT_TERMS
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .maybeSingle()
    if (error || !data) return DEFAULT_TERMS
    const settings = data.settings
    if (!isRecord(settings)) return DEFAULT_TERMS
    return mergeTerms(settings.terminology)
  } catch {
    return DEFAULT_TERMS
  }
})
