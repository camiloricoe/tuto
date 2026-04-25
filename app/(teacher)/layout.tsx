import { redirect } from 'next/navigation'
import { getSession, getPortalForRoles } from '@/lib/auth/session'
import { UserNav } from '@/components/shared/user-nav'

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session) redirect('/login')

  const portal = getPortalForRoles(session.roles)
  if (portal !== '/t') redirect(portal)

  const activeTenant = session.tenants.find((t) => t.id === session.activeTenantId)

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-subtle sticky top-0 z-50 flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold tracking-tight">TUTO</span>
          <span className="text-sm text-muted-foreground">Profesor</span>
        </div>
        <UserNav
          fullName={session.profile.fullName}
          email={session.email}
          roles={session.roles}
          tenantName={activeTenant?.name}
        />
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  )
}
