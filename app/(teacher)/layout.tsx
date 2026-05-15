import { redirect } from 'next/navigation'
import { getSession, getPortalForRoles } from '@/lib/auth/session'
import { UserNav } from '@/components/shared/user-nav'
import { SidebarNav, type NavItem } from '@/components/shared/sidebar-nav'
import { NotificationBell } from '@/components/shared/notification-bell'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { FeedbackWidget } from '@/components/shared/feedback-widget'
import { getUnreadCountAction } from '@/app/actions/notifications'

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

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-subtle sticky top-0 z-50 flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold tracking-tight">TUTO</span>
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
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
      <FeedbackWidget />
    </div>
  )
}
