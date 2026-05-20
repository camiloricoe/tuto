import {
  Building2,
  Palette,
  Calendar,
  GraduationCap,
  BookOpen,
  Users,
  Wallet,
  Receipt,
  Stamp,
  Globe,
  Check,
  Star,
  ShieldCheck,
  ScrollText,
  type LucideIcon,
} from 'lucide-react'
import type { IconName } from '@/lib/onboarding/types'
import { cn } from '@/lib/utils'

const ICONS: Record<IconName, LucideIcon> = {
  building: Building2,
  palette: Palette,
  calendar: Calendar,
  graduation: GraduationCap,
  book: BookOpen,
  users: Users,
  wallet: Wallet,
  receipt: Receipt,
  stamp: Stamp,
  globe: Globe,
  check: Check,
  star: Star,
  shield: ShieldCheck,
  audit: ScrollText,
}

export function MilestoneIcon({
  name,
  className,
}: {
  name: IconName
  className?: string
}) {
  const Icon = ICONS[name] ?? Check
  return <Icon className={cn('h-4 w-4', className)} aria-hidden />
}
