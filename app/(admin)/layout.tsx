import { redirect } from 'next/navigation'
import { getSession, getPortalForRoles } from '@/lib/auth/session'
import { UserNav } from '@/components/shared/user-nav'
import { SidebarNav, type NavItem } from '@/components/shared/sidebar-nav'
import { NotificationBell } from '@/components/shared/notification-bell'
import { TenantSwitcher } from '@/components/shared/tenant-switcher'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { getUnreadCountAction } from '@/app/actions/notifications'

const baseAdminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/a', icon: 'dashboard' },
  { label: 'Usuarios', href: '/a/users', icon: 'users' },
  {
    label: 'Academico',
    href: '/a/academic/programs',
    icon: 'academic',
    children: [
      { label: 'Programas', href: '/a/academic/programs' },
      { label: 'Cursos', href: '/a/academic/courses' },
    ],
  },
  {
    label: 'Pagos',
    href: '/a/payments/concepts',
    icon: 'payments',
    children: [
      { label: 'Conceptos', href: '/a/payments/concepts' },
      { label: 'Registrar pago', href: '/a/payments' },
      { label: 'Cargos', href: '/a/payments/charges' },
    ],
  },
  { label: 'Importar', href: '/a/import', icon: 'import' },
  { label: 'Auditoria', href: '/a/audit', icon: 'audit' },
  { label: 'Configuracion', href: '/a/settings', icon: 'settings' },
]

const tenantsNavItem: NavItem = {
  label: 'Instituciones',
  href: '/a/tenants',
  icon: 'tenants',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session) redirect('/login')

  const portal = getPortalForRoles(session.roles)
  if (portal !== '/a') redirect(portal)

  const activeTenant = session.tenants.find((t) => t.id === session.activeTenantId)
  const unreadCount = await getUnreadCountAction()

  const adminNavItems: NavItem[] = session.isSuperAdmin
    ? [tenantsNavItem, ...baseAdminNavItems]
    : baseAdminNavItems

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-subtle sticky top-0 z-50 flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold tracking-tight">TUTO</span>
          <span className="text-sm text-muted-foreground">Admin</span>
          {session.isSuperAdmin && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
              Super Admin
            </span>
          )}
          <TenantSwitcher
            tenants={session.tenants}
            activeTenantId={session.activeTenantId}
            isSuperAdmin={session.isSuperAdmin}
          />
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationBell initialUnreadCount={unreadCount} />
          <UserNav
            fullName={session.profile.fullName}
            email={session.email}
            roles={session.roles}
            tenantName={activeTenant?.name}
          />
        </div>
      </header>
      <div className="flex">
        <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:bg-background/50 min-h-[calc(100vh-57px)] shrink-0 px-2">
          <SidebarNav items={adminNavItems} />
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
