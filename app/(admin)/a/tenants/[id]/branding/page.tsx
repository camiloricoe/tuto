import { getBrandingByTenantId } from '@/lib/branding/queries'
import { BrandingForm } from '@/app/(admin)/a/settings/branding/form'

export const metadata = {
  title: 'Branding',
}

export default async function TenantBrandingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // Layout already validated UUID format + tenant existence + super_admin OR
  // admin-of-tenant access. If we're rendering, the user is authorized.
  const { id } = await params
  const branding = await getBrandingByTenantId(id)

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Branding</h2>
        <p className="text-sm text-muted-foreground">
          Personaliza logo, colores y mensajes que verán los usuarios de esta
          institución.
        </p>
      </header>

      <BrandingForm
        tenantId={id}
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
