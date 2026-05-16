'use server'

import { requireSession } from '@/lib/auth/session'
import { requireSuperAdmin } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/audit/activity'
import { revalidateTenantResolution } from '@/lib/tenant/revalidate'
import { validateCustomDomain } from '@/lib/validators/custom-domain'

// ─── Types ────────────────────────────────────────────────────────────────

export type DomainActionResult =
  | { success: true; domain: string | null }
  | { success: false; error: string }

export type VerifyResult = {
  ok: boolean
  message: string
}

const VERIFY_TIMEOUT_MS = 5000

// ─── Helpers ──────────────────────────────────────────────────────────────

async function loadTenantOrFail(tenantId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tenants')
    .select('id, name, subdomain, custom_domain')
    .eq('id', tenantId)
    .single()
  if (error || !data) return null
  return data as {
    id: string
    name: string
    subdomain: string | null
    custom_domain: string | null
  }
}

// ─── setCustomDomainAction ────────────────────────────────────────────────

export async function setCustomDomainAction(
  tenantId: string,
  domain: string,
): Promise<DomainActionResult> {
  const session = await requireSession()
  await requireSuperAdmin()

  if (!tenantId || typeof tenantId !== 'string') {
    return { success: false, error: 'Tenant invalido' }
  }

  const validation = validateCustomDomain(domain)
  if (!validation.ok) return { success: false, error: validation.error }

  const normalized = validation.normalized

  const admin = createAdminClient()
  const tenant = await loadTenantOrFail(tenantId)
  if (!tenant) return { success: false, error: 'Tenant no encontrado' }

  // Pre-check uniqueness for a nicer error message (DB constraint still
  // enforces it on the insert below).
  const { data: clash } = await admin
    .from('tenants')
    .select('id, name')
    .eq('custom_domain', normalized)
    .neq('id', tenantId)
    .maybeSingle()

  if (clash) {
    return {
      success: false,
      error: `El dominio ya esta en uso por "${clash.name}"`,
    }
  }

  const { error: updateError } = await admin
    .from('tenants')
    .update({ custom_domain: normalized })
    .eq('id', tenantId)

  if (updateError) {
    if (updateError.code === '23505') {
      return { success: false, error: 'El dominio ya esta en uso' }
    }
    return { success: false, error: 'No se pudo guardar el dominio' }
  }

  await logActivity({
    tenantId: tenant.id,
    actorUserId: session.userId,
    actionCode: 'tenant.custom_domain.set',
    resourceType: 'tenant',
    resourceId: tenant.id,
    summary: `Dominio personalizado asignado: ${normalized}`,
    metadata: {
      previous: tenant.custom_domain,
      next: normalized,
    },
  })

  // Revalidate both subdomain and custom domain cache entries so the
  // resolver picks up the change immediately.
  if (tenant.subdomain) revalidateTenantResolution(tenant.subdomain)
  revalidateTenantResolution(normalized)
  if (tenant.custom_domain && tenant.custom_domain !== normalized) {
    revalidateTenantResolution(tenant.custom_domain)
  }

  return { success: true, domain: normalized }
}

// ─── removeCustomDomainAction ─────────────────────────────────────────────

export async function removeCustomDomainAction(
  tenantId: string,
): Promise<DomainActionResult> {
  const session = await requireSession()
  await requireSuperAdmin()

  if (!tenantId || typeof tenantId !== 'string') {
    return { success: false, error: 'Tenant invalido' }
  }

  const admin = createAdminClient()
  const tenant = await loadTenantOrFail(tenantId)
  if (!tenant) return { success: false, error: 'Tenant no encontrado' }

  if (!tenant.custom_domain) {
    // Nothing to remove — treat as success so the UI can refresh cleanly.
    return { success: true, domain: null }
  }

  const previous = tenant.custom_domain

  const { error } = await admin
    .from('tenants')
    .update({ custom_domain: null })
    .eq('id', tenantId)

  if (error) return { success: false, error: 'No se pudo eliminar el dominio' }

  await logActivity({
    tenantId: tenant.id,
    actorUserId: session.userId,
    actionCode: 'tenant.custom_domain.removed',
    resourceType: 'tenant',
    resourceId: tenant.id,
    summary: `Dominio personalizado eliminado: ${previous}`,
    metadata: { previous },
  })

  if (tenant.subdomain) revalidateTenantResolution(tenant.subdomain)
  revalidateTenantResolution(previous)

  return { success: true, domain: null }
}

// ─── verifyCustomDomainAction ─────────────────────────────────────────────

export async function verifyCustomDomainAction(domain: string): Promise<VerifyResult> {
  // Super-admin gate (don't expose probing to non-admins).
  await requireSession()
  await requireSuperAdmin()

  const validation = validateCustomDomain(domain)
  if (!validation.ok) return { ok: false, message: validation.error }

  const target = `https://${validation.normalized}/api/health/ping`

  try {
    const res = await fetch(target, {
      method: 'GET',
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      cache: 'no-store',
      headers: { accept: 'application/json' },
    })

    if (!res.ok) {
      return {
        ok: false,
        message: `El dominio respondio con HTTP ${res.status}. Revisa DNS y SSL.`,
      }
    }

    let body: unknown
    try {
      body = await res.json()
    } catch {
      return {
        ok: false,
        message: 'El dominio respondio pero el cuerpo no es JSON valido.',
      }
    }

    if (
      typeof body === 'object' &&
      body !== null &&
      (body as { ok?: unknown }).ok === true
    ) {
      return { ok: true, message: 'Dominio verificado. Apunta a TUTO correctamente.' }
    }

    return {
      ok: false,
      message: 'El dominio respondio pero no devolvio ok=true.',
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('abort')) {
      return {
        ok: false,
        message: 'Tiempo de espera agotado (5s). Revisa DNS y propagacion.',
      }
    }
    return {
      ok: false,
      message: `No se pudo conectar: ${msg}`,
    }
  }
}
