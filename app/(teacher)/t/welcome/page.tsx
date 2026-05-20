import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { getProgressForRole } from '@/lib/onboarding/progress'
import { MilestoneList } from '@/components/onboarding/milestone-list'
import { MilestoneProgressHeader } from '@/components/onboarding/milestone-progress-header'

export default async function TeacherWelcomePage() {
  const session = await requireSession()

  if (!session.roles.includes('teacher')) redirect('/t')

  const progress = await getProgressForRole(
    {
      userId: session.userId,
      tenantId: session.activeTenantId,
      isSuperAdmin: session.isSuperAdmin,
    },
    'teacher',
  )

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <MilestoneProgressHeader progress={progress} />
      <MilestoneList progress={progress} />
    </div>
  )
}
