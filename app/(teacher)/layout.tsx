import { redirect } from 'next/navigation'
import { getSession, getPortalForRoles } from '@/lib/auth/session'
import { UserNav } from '@/components/shared/user-nav'
import { SidebarNav, type NavItem } from '@/components/shared/sidebar-nav'
import { NotificationBell } from '@/components/shared/notification-bell'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { FeedbackWidget } from '@/components/shared/feedback-widget'
import { getUnreadCountAction } from '@/app/actions/notifications'
import { BrandLogo } from '@/components/brand/brand-logo'
import { getBrandingByTenantId } from '@/lib/branding/queries'
import { MilestoneWidget } from '@/components/onboarding/milestone-widget'
import { getProgressForRole } from '@/lib/onboarding/progress'

const teacherNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/t', icon: 'dashboard' },
  { label: 'Mis Cursos', href: '/t/courses', icon: 'courses' },
  { label: 'Mis tickets', href: '/t/feedback', icon: 'feedback' },
]

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session) redirect('/login')

  const portal = getPortalForRoles(session.roles)
  if (portal !== '/t') redirect(portal)

  const activeTenant = session.tenants.find((t) => t.id === session.activeTenantId)
  const unreadCount = await getUnreadCountAction()
  // Branding resolved by active tenant id so apex + cookie-switched tenant
  // (e.g. super admin) still gets the right logo. Falls back to "TUTO" text.
  const branding = session.activeTenantId
    ? await getBrandingByTenantId(session.activeTenantId)
    : null
  const brandLabel = activeTenant?.name ?? 'TUTO'

  const onboardingProgress = session.roles.includes('teacher')
    ? await getProgressForRole(
        {
          userId: session.userId,
          tenantId: session.activeTenantId,
          isSuperAdmin: session.isSuperAdmin,
        },
        'teacher',
      )
    : null

  return (
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
          <span className="text-sm text-muted-foreground">Profesor</span>
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
          <SidebarNav items={teacherNavItems} />
          {onboardingProgress && (
            <div className="mt-auto">
              <MilestoneWidget
                progress={onboardingProgress}
                welcomePath="/t/welcome"
              />
            </div>
          )}
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
      <FeedbackWidget />
    </div>
  )
}
