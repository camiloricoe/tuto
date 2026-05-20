export type RoleCode =
  | 'super_admin'
  | 'admin'
  | 'coordinator'
  | 'treasurer'
  | 'teacher'
  | 'student'

export type MilestoneScope = 'tenant' | 'global'

export type IconName =
  | 'building'
  | 'palette'
  | 'calendar'
  | 'graduation'
  | 'book'
  | 'users'
  | 'wallet'
  | 'receipt'
  | 'stamp'
  | 'globe'
  | 'check'
  | 'star'
  | 'shield'
  | 'audit'

export type Milestone = {
  code: string
  role: RoleCode
  scope: MilestoneScope
  title: string
  description: string
  href: string
  icon: IconName
  order: number
}

export type MilestoneStatus = {
  milestone: Milestone
  completed: boolean
  dismissed: boolean
}

export type RoleProgress = {
  role: RoleCode
  scope: MilestoneScope
  total: number
  completed: number
  dismissed: number
  pending: number
  percent: number
  items: MilestoneStatus[]
}
