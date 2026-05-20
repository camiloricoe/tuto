import { MilestoneItem } from './milestone-item'
import type { RoleProgress } from '@/lib/onboarding/types'

export function MilestoneList({ progress }: { progress: RoleProgress }) {
  // Order: pending first, then dismissed, then completed
  const pending = progress.items.filter((i) => !i.completed && !i.dismissed)
  const dismissed = progress.items.filter((i) => !i.completed && i.dismissed)
  const completed = progress.items.filter((i) => i.completed)
  const ordered = [...pending, ...dismissed, ...completed]

  return (
    <div className="space-y-2" data-testid="milestone-list">
      {ordered.map((item) => (
        <MilestoneItem key={item.milestone.code} item={item} />
      ))}
    </div>
  )
}
