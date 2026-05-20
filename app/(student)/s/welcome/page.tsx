import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { getProgressForRole } from '@/lib/onboarding/progress'
import { MilestoneList } from '@/components/onboarding/milestone-list'
import { MilestoneProgressHeader } from '@/components/onboarding/milestone-progress-header'

export default async function StudentWelcomePage() {
  const session = await requireSession()

  if (!session.roles.includes('student')) redirect('/s')

  const progress = await getProgressForRole(
    {
      userId: session.userId,
      tenantId: session.activeTenantId,
      isSuperAdmin: session.isSuperAdmin,
    },
    'student',
  )

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <MilestoneProgressHeader progress={progress} />
      <MilestoneList progress={progress} />
    </div>
  )
}
