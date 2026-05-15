'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CreditCard,
  Upload,
  Settings,
  ClipboardList,
  ScrollText,
  Building2,
  type LucideIcon,
} from 'lucide-react'

const ICONS = {
  dashboard: LayoutDashboard,
  users: Users,
  academic: GraduationCap,
  courses: BookOpen,
  payments: CreditCard,
  import: Upload,
  settings: Settings,
  grades: ClipboardList,
  audit: ScrollText,
  tenants: Building2,
} as const satisfies Record<string, LucideIcon>

export type IconName = keyof typeof ICONS

export type NavItem = {
  label: string
  href: string
  icon: IconName
  children?: { label: string; href: string }[]
}

type SidebarNavProps = {
  items: NavItem[]
}

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 py-4">
      {items.map((item) => {
        const isActive =
          item.href === pathname ||
          (item.children?.some((c) => c.href === pathname) ?? false)
        const Icon = ICONS[item.icon]

        return (
          <div key={item.href}>
            <a
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </a>
            {item.children && item.children.length > 0 && (
              <div className="ml-7 mt-1 flex flex-col gap-1">
                {item.children.map((child) => {
                  const childActive = child.href === pathname
                  return (
                    <a
                      key={child.href}
                      href={child.href}
                      className={cn(
                        'rounded-md px-3 py-1.5 text-sm transition-colors',
                        childActive
                          ? 'text-primary'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {child.label}
                    </a>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
