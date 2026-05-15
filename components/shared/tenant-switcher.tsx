'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { setActiveTenantAction } from '@/app/actions/tenant-switch'

type TenantOption = { id: string; name: string; slug: string }

type TenantSwitcherProps = {
  tenants: TenantOption[]
  activeTenantId: string | null
  isSuperAdmin: boolean
}

export function TenantSwitcher({ tenants, activeTenantId, isSuperAdmin }: TenantSwitcherProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const active = tenants.find((t) => t.id === activeTenantId)

  if (tenants.length === 0) {
    return (
      <span className="rounded-full bg-muted px-3 py-0.5 text-xs font-medium text-muted-foreground">
        Sin tenant
      </span>
    )
  }

  if (tenants.length === 1 && !isSuperAdmin) {
    return (
      <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
        {active?.name}
      </span>
    )
  }

  function handleSelect(tenantId: string) {
    if (tenantId === activeTenantId) return
    startTransition(async () => {
      await setActiveTenantAction(tenantId)
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          data-testid="tenant-switcher"
          className="h-7 gap-1.5 rounded-full bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/20"
          disabled={isPending}
        >
          <Building2 className="h-3 w-3" />
          {active?.name ?? 'Seleccionar tenant'}
          <ChevronDown className="h-3 w-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {isSuperAdmin ? 'Todas las instituciones' : 'Tus instituciones'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((tenant) => {
          const isActive = tenant.id === activeTenantId
          return (
            <DropdownMenuItem
              key={tenant.id}
              onSelect={(e) => {
                e.preventDefault()
                handleSelect(tenant.id)
              }}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{tenant.name}</span>
                <span className="text-xs text-muted-foreground">{tenant.slug}</span>
              </div>
              {isActive && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
