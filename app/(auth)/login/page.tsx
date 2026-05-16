import { headers } from 'next/headers'
import { resolveTenant } from '@/lib/tenant/resolver'
import { getBrandingByTenantId, type TenantBranding } from '@/lib/branding/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic'

/**
 * Validates that a branding logo URL is safe to render in <img src>.
 * Requirements: must be HTTPS and from a Supabase storage host.
 * Returns the URL if valid, otherwise null.
 */
function safeBrandingImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return null
    // Allow Supabase storage hosts (*.supabase.co, *.supabase.in) only.
    const host = parsed.hostname.toLowerCase()
    if (host.endsWith('.supabase.co') || host.endsWith('.supabase.in')) {
      return parsed.toString()
    }
    return null
  } catch {
    return null
  }
}

export default async function LoginPage() {
  const hdrs = await headers()
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host')
  const tenant = await resolveTenant(host)

  let branding: TenantBranding | null = null
  if (tenant) {
    try {
      branding = await getBrandingByTenantId(tenant.tenantId)
    } catch {
      branding = null
    }
  }

  const logoUrl = safeBrandingImageUrl(branding?.logo_url)
  const headline = tenant ? `Iniciar sesion en ${tenant.name}` : 'TUTO'
  const tagline = tenant
    ? branding?.login_message?.trim() || 'Bienvenido al portal academico'
    : 'Iniciar sesion'

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <Card className="glass w-full max-w-sm">
        <CardHeader className="text-center">
          {logoUrl ? (
            <div className="mb-3 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={tenant ? `Logo de ${tenant.name}` : 'TUTO'}
                className="h-12 w-auto object-contain"
              />
            </div>
          ) : (
            !tenant && (
              <CardTitle className="text-3xl font-semibold tracking-tight">
                TUTO
              </CardTitle>
            )
          )}
          {tenant && (
            <CardTitle className="text-xl font-semibold tracking-tight">
              {headline}
            </CardTitle>
          )}
          <p className="text-sm text-muted-foreground">{tagline}</p>
        </CardHeader>
        <CardContent>
          <LoginForm
            tenantId={tenant?.tenantId ?? null}
            tenantName={tenant?.name ?? null}
          />
        </CardContent>
      </Card>
    </main>
  )
}
