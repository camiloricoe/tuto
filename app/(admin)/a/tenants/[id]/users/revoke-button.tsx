'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { revokeTenantRoleAction } from '@/app/actions/tenant-users'

type RevokeButtonProps = {
  tenantId: string
  userRoleId: string
  roleLabel: string
}

export function RevokeButton({ tenantId, userRoleId, roleLabel }: RevokeButtonProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 4_000)
      return
    }
    startTransition(async () => {
      const formData = new FormData()
      formData.set('tenantId', tenantId)
      formData.set('userRoleId', userRoleId)
      const res = await revokeTenantRoleAction(null, formData)
      if (res && 'success' in res && res.success) {
        toast.success(res.message ?? `Rol ${roleLabel} revocado`)
        setConfirming(false)
        router.refresh()
      } else if (res && 'error' in res) {
        toast.error(res.error)
        setConfirming(false)
      }
    })
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={confirming ? 'destructive' : 'outline'}
      onClick={handleClick}
      disabled={isPending}
      className="gap-1"
      aria-label={`Revocar rol ${roleLabel}`}
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
      {confirming ? '¿Confirmar?' : 'Revocar'}
    </Button>
  )
}
