'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Archive, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { archiveGroupAction } from '@/app/actions/academic/groups'

export function ArchiveGroupButton({ groupId }: { groupId: string }) {
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
      const res = await archiveGroupAction(groupId)
      if (res && 'error' in res && res.error) {
        toast.error(res.error)
        return
      }
      toast.success('Grupo archivado')
      router.refresh()
    })
  }

  return (
    <Button
      type="button"
      variant={confirming ? 'destructive' : 'outline'}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className="gap-1"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Archive className="h-4 w-4" />
      )}
      {confirming ? 'Confirmar?' : 'Archivar'}
    </Button>
  )
}
