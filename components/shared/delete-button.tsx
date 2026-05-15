'use client'

import { useState, useTransition } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type DeleteButtonProps = {
  action: () => Promise<{ error?: string; success?: boolean } | void>
  confirmLabel?: string
  size?: 'sm' | 'default' | 'icon'
}

export function DeleteButton({ action, confirmLabel = 'Eliminar', size = 'sm' }: DeleteButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 4_000)
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await action()
      if (res && 'error' in res && res.error) setError(res.error)
      else window.location.reload()
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant={confirming ? 'destructive' : 'outline'}
        size={size}
        onClick={handleClick}
        disabled={isPending}
        className="gap-1"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        {size !== 'icon' && (confirming ? 'Confirmar?' : confirmLabel)}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
