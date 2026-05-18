'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { ChevronRight, Check, X } from 'lucide-react'

import {
  advanceFeedbackStatusAction,
  updateFeedbackStatusAction,
} from '@/app/actions/feedback'

const NEXT_LABEL: Record<string, string> = {
  open: 'Triagear',
  triaged: 'En progreso',
  in_progress: 'Resolver',
}

export function FeedbackQuickActions({
  ticketId,
  status,
}: {
  ticketId: string
  status: string
}) {
  const [pending, startTransition] = useTransition()
  const nextLabel = NEXT_LABEL[status]
  const isTerminal = status === 'resolved' || status === 'declined'

  function handleAdvance(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!nextLabel) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set('ticketId', ticketId)
      const res = await advanceFeedbackStatusAction(null, fd)
      if ('error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Avanzado: ${nextLabel}`)
      }
    })
  }

  function handleSetStatus(e: React.MouseEvent, status: 'resolved' | 'declined') {
    e.preventDefault()
    e.stopPropagation()
    startTransition(async () => {
      const fd = new FormData()
      fd.set('ticketId', ticketId)
      fd.set('status', status)
      const res = await updateFeedbackStatusAction(null, fd)
      if ('error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success(status === 'resolved' ? 'Resuelto' : 'Rechazado')
      }
    })
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {!isTerminal && nextLabel && (
        <button
          type="button"
          onClick={handleAdvance}
          disabled={pending}
          title={`Avanzar a ${nextLabel}`}
          className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-[11px] font-medium text-foreground hover:bg-accent disabled:opacity-50"
        >
          <ChevronRight className="h-3 w-3" />
          {nextLabel}
        </button>
      )}
      {!isTerminal && (
        <>
          <button
            type="button"
            onClick={(e) => handleSetStatus(e, 'resolved')}
            disabled={pending}
            title="Marcar como resuelto"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background text-green-600 hover:bg-green-500/10 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => handleSetStatus(e, 'declined')}
            disabled={pending}
            title="Rechazar"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  )
}
