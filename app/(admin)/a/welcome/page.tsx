import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { pickRoleForPortal } from '@/lib/onboarding/catalog'
import { getProgressForRole } from '@/lib/onboarding/progress'
import { MilestoneList } from '@/components/onboarding/milestone-list'
import { MilestoneProgressHeader } from '@/components/onboarding/milestone-progress-header'

export default async function AdminWelcomePage() {
  const session = await requireSession()
  const role = pickRoleForPortal(session.roles, '/a')

  if (!role) redirect('/a')

  const progress = await getProgressForRole(
    {
      userId: session.userId,
      tenantId: role === 'super_admin' ? null : session.activeTenantId,
      isSuperAdmin: session.isSuperAdmin,
    },
    role,
  )

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <MilestoneProgressHeader progress={progress} />
      <MilestoneList progress={progress} />
    </div>
  )
}
