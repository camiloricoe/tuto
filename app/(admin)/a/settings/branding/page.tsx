import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { getBrandingByTenantId } from '@/lib/branding/queries'
import { BrandingForm } from './form'

export const metadata = {
  title: 'Personalización',
}

export default async function BrandingSettingsPage() {
  const session = await requireSession()
  await requirePermission('tenants:write')

  if (!session.activeTenantId) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Branding</h1>
        <p className="text-muted-foreground">
          Selecciona una institución primero.
        </p>
      </div>
    )
  }

  const branding = await getBrandingByTenantId(session.activeTenantId)

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Branding</h1>
        <p className="text-sm text-muted-foreground">
          Personaliza el logo, colores e información de soporte que verán los
          usuarios de tu institución.
        </p>
      </header>

      <BrandingForm
        initial={{
          logo_url: branding?.logo_url ?? null,
          favicon_url: branding?.favicon_url ?? null,
          primary_hsl: branding?.primary_hsl ?? '',
          accent_hsl: branding?.accent_hsl ?? '',
          login_message: branding?.login_message ?? '',
          email_from_name: branding?.email_from_name ?? '',
          email_reply_to: branding?.email_reply_to ?? '',
          support_url: branding?.support_url ?? '',
          support_email: branding?.support_email ?? '',
        }}
      />
    </div>
  )
}
