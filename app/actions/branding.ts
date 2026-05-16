'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'

import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/audit/activity'
import {
  AUDIT_ACTION_BRANDING_UPDATE,
  updateBranding,
} from '@/lib/branding/queries'
import {
  deleteTenantAsset,
  uploadTenantAsset,
} from '@/lib/branding/storage'
import { revalidateTenantResolution } from '@/lib/tenant/revalidate'

// ─── Constants ──────────────────────────────────────────────────────────────

const HSL_RE = /^\d{1,3} \d{1,3}% \d{1,3}%$/

const LOGO_MAX_BYTES = 2 * 1024 * 1024 // 2MB
const FAVICON_MAX_BYTES = 200 * 1024 // 200KB

const LOGO_MIME_TYPES = new Set([
  'image/png',
  'image/svg+xml',
  'image/jpeg',
])

const FAVICON_MIME_TYPES = new Set([
  'image/png',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/svg+xml',
])

const LOGIN_MESSAGE_MAX = 200

// ─── Schemas ────────────────────────────────────────────────────────────────

const emptyToUndefined = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v

const updateBrandingSchema = z.object({
  primary_hsl: z
    .preprocess(
      emptyToUndefined,
      z
        .string()
        .regex(HSL_RE, 'HSL primario invalido (formato: "262 83% 58%")')
        .optional()
        .nullable(),
    )
    .optional(),
  accent_hsl: z
    .preprocess(
      emptyToUndefined,
      z
        .string()
        .regex(HSL_RE, 'HSL de acento invalido (formato: "262 83% 58%")')
        .optional()
        .nullable(),
    )
    .optional(),
  login_message: z
    .preprocess(
      emptyToUndefined,
      z
        .string()
        .max(LOGIN_MESSAGE_MAX, `Maximo ${LOGIN_MESSAGE_MAX} caracteres`)
        .optional()
        .nullable(),
    )
    .optional(),
  email_from_name: z
    .preprocess(
      emptyToUndefined,
      z.string().max(120).optional().nullable(),
    )
    .optional(),
  email_reply_to: z
    .preprocess(
      emptyToUndefined,
      z.string().email('Email de respuesta invalido').optional().nullable(),
    )
    .optional(),
  support_url: z
    .preprocess(
      emptyToUndefined,
      z.string().url('URL de soporte invalida').optional().nullable(),
    )
    .optional(),
  support_email: z
    .preprocess(
      emptyToUndefined,
      z.string().email('Email de soporte invalido').optional().nullable(),
    )
    .optional(),
})

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getTenantSubdomain(tenantId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('tenants')
    .select('subdomain')
    .eq('id', tenantId)
    .maybeSingle()
  return data?.subdomain ?? null
}

async function requireBrandingAccess() {
  const session = await requireSession()
  if (!session.activeTenantId) {
    throw new Error('No hay tenant activo')
  }
  // Per task spec: admin/super_admin only. The codebase uses tenants:write
  // (granted exclusively to admin + super_admin per seed/migration) as the
  // tenant-level write gate; we keep parity by checking it here.
  await requirePermission('tenants:write')
  return session
}

// ─── Update Action ──────────────────────────────────────────────────────────

export type BrandingActionResult =
  | { success: true; publicUrl?: string }
  | { success: false; error: string }

export async function updateBrandingAction(
  _prev: unknown,
  formData: FormData,
): Promise<BrandingActionResult> {
  try {
    const session = await requireBrandingAccess()
    const tenantId = session.activeTenantId as string

    const raw = {
      primary_hsl: formData.get('primary_hsl'),
      accent_hsl: formData.get('accent_hsl'),
      login_message: formData.get('login_message'),
      email_from_name: formData.get('email_from_name'),
      email_reply_to: formData.get('email_reply_to'),
      support_url: formData.get('support_url'),
      support_email: formData.get('support_email'),
    }

    const parsed = updateBrandingSchema.safeParse(raw)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Datos invalidos',
      }
    }

    // Build patch with explicit nulls allowed (so clearing a field works)
    const patch: Record<string, string | null> = {}
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value === undefined) continue
      patch[key] = value === null ? null : (value as string)
    }

    await updateBranding(tenantId, patch)

    await logActivity({
      tenantId,
      actorUserId: session.userId,
      actionCode: AUDIT_ACTION_BRANDING_UPDATE,
      resourceType: 'tenant_branding',
      resourceId: tenantId,
      summary: 'Branding actualizado',
      metadata: { fields: Object.keys(patch).join(',') },
    })

    revalidatePath('/a/settings/branding')
    const subdomain = await getTenantSubdomain(tenantId)
    if (subdomain) revalidateTenantResolution(subdomain)

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al actualizar branding',
    }
  }
}

// ─── Upload Helpers ─────────────────────────────────────────────────────────

async function handleAssetUpload(
  formData: FormData,
  kind: 'logo' | 'favicon',
): Promise<BrandingActionResult> {
  try {
    const session = await requireBrandingAccess()
    const tenantId = session.activeTenantId as string

    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: 'Archivo requerido' }
    }

    const maxBytes = kind === 'logo' ? LOGO_MAX_BYTES : FAVICON_MAX_BYTES
    if (file.size > maxBytes) {
      const limit = kind === 'logo' ? '2MB' : '200KB'
      return { success: false, error: `El archivo excede ${limit}` }
    }

    const allowedMimes = kind === 'logo' ? LOGO_MIME_TYPES : FAVICON_MIME_TYPES
    if (!allowedMimes.has(file.type)) {
      return {
        success: false,
        error: `Tipo de archivo no permitido (${file.type || 'desconocido'})`,
      }
    }

    const { publicUrl, path } = await uploadTenantAsset(
      tenantId,
      file,
      kind,
      file.name,
    )

    const patch =
      kind === 'logo'
        ? { logo_url: publicUrl, logo_storage_path: path }
        : { favicon_url: publicUrl, favicon_storage_path: path }

    await updateBranding(tenantId, patch)

    await logActivity({
      tenantId,
      actorUserId: session.userId,
      actionCode: AUDIT_ACTION_BRANDING_UPDATE,
      resourceType: 'tenant_branding',
      resourceId: tenantId,
      summary: `${kind === 'logo' ? 'Logo' : 'Favicon'} actualizado`,
      metadata: { kind, size: file.size, mime: file.type },
    })

    revalidatePath('/a/settings/branding')
    const subdomain = await getTenantSubdomain(tenantId)
    if (subdomain) revalidateTenantResolution(subdomain)

    return { success: true, publicUrl }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al subir el archivo',
    }
  }
}

export async function uploadLogoAction(
  formData: FormData,
): Promise<BrandingActionResult> {
  return handleAssetUpload(formData, 'logo')
}

export async function uploadFaviconAction(
  formData: FormData,
): Promise<BrandingActionResult> {
  return handleAssetUpload(formData, 'favicon')
}

// ─── Removal Helpers ────────────────────────────────────────────────────────

async function handleAssetRemoval(
  kind: 'logo' | 'favicon',
): Promise<BrandingActionResult> {
  try {
    const session = await requireBrandingAccess()
    const tenantId = session.activeTenantId as string

    const admin = createAdminClient()
    const { data: current } = await admin
      .from('tenant_branding')
      .select('logo_storage_path, favicon_storage_path')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    const currentPath =
      kind === 'logo'
        ? current?.logo_storage_path
        : current?.favicon_storage_path

    if (currentPath) {
      try {
        await deleteTenantAsset(currentPath)
      } catch {
        // Non-fatal: storage object may already be gone.
      }
    }

    const patch =
      kind === 'logo'
        ? { logo_url: null, logo_storage_path: null }
        : { favicon_url: null, favicon_storage_path: null }

    await updateBranding(tenantId, patch)

    await logActivity({
      tenantId,
      actorUserId: session.userId,
      actionCode: AUDIT_ACTION_BRANDING_UPDATE,
      resourceType: 'tenant_branding',
      resourceId: tenantId,
      summary: `${kind === 'logo' ? 'Logo' : 'Favicon'} eliminado`,
      metadata: { kind, removed: true },
    })

    revalidatePath('/a/settings/branding')
    const subdomain = await getTenantSubdomain(tenantId)
    if (subdomain) revalidateTenantResolution(subdomain)

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al eliminar el archivo',
    }
  }
}

export async function removeLogoAction(): Promise<BrandingActionResult> {
  return handleAssetRemoval('logo')
}

export async function removeFaviconAction(): Promise<BrandingActionResult> {
  return handleAssetRemoval('favicon')
}
