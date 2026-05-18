import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import path from 'path'

const BUCKET = 'tenant-assets'

// Use the admin (service role) client for storage operations. The calling
// server action MUST validate authorization first — admin client bypasses
// storage RLS, which is correct here because the policy expression had to
// JOIN through user_roles and roles, both of which have their own RLS that
// silently filtered the EXISTS subquery to empty rows under SSR auth.
export async function uploadTenantAsset(
  tenantId: string,
  file: File | Buffer,
  kind: 'logo' | 'favicon',
  filename: string,
): Promise<{ publicUrl: string; path: string }> {
  const supabase = createAdminClient()

  const ext = path.extname(filename).toLowerCase() || '.png'
  const objectPath = `${tenantId}/${kind}-${Date.now()}${ext}`

  // Copy Buffer into a fresh ArrayBuffer to avoid SharedArrayBuffer typing issues
  let body: Blob | File
  let contentType: string
  if (file instanceof File) {
    body = file
    contentType = file.type
  } else {
    const copy = new ArrayBuffer(file.byteLength)
    new Uint8Array(copy).set(file)
    body = new Blob([copy])
    contentType = 'application/octet-stream'
  }

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, body, { contentType, upsert: true })

  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath)
  return { publicUrl: data.publicUrl, path: objectPath }
}

export async function deleteTenantAsset(objectPath: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.storage.from(BUCKET).remove([objectPath])
  if (error) throw error
}
