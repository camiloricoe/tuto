import { redirect } from 'next/navigation'
import { getSession, getPortalForRoles } from '@/lib/auth/session'
import { UserNav } from '@/components/shared/user-nav'
import { SidebarNav, type NavItem } from '@/components/shared/sidebar-nav'
import { NotificationBell } from '@/components/shared/notification-bell'
import { TenantSwitcher } from '@/components/shared/tenant-switcher'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { FeedbackWidget } from '@/components/shared/feedback-widget'
import { getUnreadCountAction } from '@/app/actions/notifications'
import { BrandLogo } from '@/components/brand/brand-logo'
import { getBrandingByTenantId } from '@/lib/branding/queries'
import { MilestoneWidget } from '@/components/onboarding/milestone-widget'
import { getProgressForRole } from '@/lib/onboarding/progress'
import { pickRoleForPortal } from '@/lib/onboarding/catalog'
import { getTenantTerms } from '@/lib/terminology/server'
import { TermsProvider } from '@/components/terminology/terms-provider'

import type { TenantTerms } from '@/lib/terminology/defaults'

function buildAdminNavItems(terms: TenantTerms): NavItem[] {
  return [
    { label: 'Dashboard', href: '/a', icon: 'dashboard' },
    { label: 'Usuarios', href: '/a/users', icon: 'users' },
    {
      label: 'Academico',
      href: '/a/academic/programs',
      icon: 'academic',
      children: [
        { label: terms.program.plural, href: '/a/academic/programs' },
        { label: terms.curriculum.plural, href: '/a/academic/curriculums' },
        { label: terms.group.plural, href: '/a/academic/groups' },
        { label: terms.course.plural, href: '/a/academic/courses' },
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
    { label: 'Feedback', href: '/a/feedback', icon: 'feedback' },
    { label: 'Auditoria', href: '/a/audit', icon: 'audit' },
    { label: 'Configuracion', href: '/a/settings', icon: 'settings' },
  ]
}

const tenantsNavItem: NavItem = {
  label: 'Instituciones',
  href: '/a/tenants',
  icon: 'tenants',
}

const healthNavItem: NavItem = {
  label: 'Salud',
  href: '/a/health',
  icon: 'health',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session) redirect('/login')

  const portal = getPortalForRoles(session.roles)
  if (portal !== '/a') redirect(portal)

  const activeTenant = session.tenants.find((t) => t.id === session.activeTenantId)
  const unreadCount = await getUnreadCountAction()

  // Fetch branding by active tenant id so the apex-host + cookie-switched
  // tenant case still resolves a logo (hostname-based resolver returns null
  // on apex). When no active tenant, branding stays null and the "TUTO"
  // fallback renders.
  const branding = session.activeTenantId
    ? await getBrandingByTenantId(session.activeTenantId)
    : null
  const brandLabel = activeTenant?.name ?? 'TUTO'

  const terms = await getTenantTerms(session.activeTenantId)
  const baseAdminNavItems = buildAdminNavItems(terms)

  const adminNavItems: NavItem[] = session.isSuperAdmin
    ? [tenantsNavItem, ...baseAdminNavItems, healthNavItem]
    : baseAdminNavItems

  const onboardingRole = pickRoleForPortal(session.roles, '/a')
  const onboardingProgress = onboardingRole
    ? await getProgressForRole(
        {
          userId: session.userId,
          tenantId:
            onboardingRole === 'super_admin' ? null : session.activeTenantId,
          isSuperAdmin: session.isSuperAdmin,
        },
        onboardingRole,
      )
    : null

  return (
    <TermsProvider terms={terms}>
    <div className="min-h-screen bg-background">
      <header className="glass-subtle sticky top-0 z-50 flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-4">
          {branding?.logo_url ? (
            <BrandLogo
              size="sm"
              url={branding.logo_url}
              alt={brandLabel}
              className="h-7 w-auto"
            />
          ) : (
            <span className="text-lg font-semibold tracking-tight">{brandLabel}</span>
          )}
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
          {onboardingProgress && (
            <div className="mt-auto">
              <MilestoneWidget
                progress={onboardingProgress}
                welcomePath="/a/welcome"
              />
            </div>
          )}
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
      <FeedbackWidget />
    </div>
    </TermsProvider>
  )
}
