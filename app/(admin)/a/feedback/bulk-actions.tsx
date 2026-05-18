'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { ChevronsRight } from 'lucide-react'

import { bulkAdvanceFeedbackStatusAction } from '@/app/actions/feedback'

const STAGE_LABEL: Record<string, string> = {
  open: 'abiertos → triageados',
  triaged: 'triageados → en progreso',
  in_progress: 'en progreso → resueltos',
}

export function FeedbackBulkActions({
  counts,
}: {
  counts: { open: number; triaged: number; in_progress: number }
}) {
  const [pending, startTransition] = useTransition()

  function handleBulkAdvance(fromStatus: 'open' | 'triaged' | 'in_progress') {
    const total = counts[fromStatus]
    if (total === 0) return
    if (!confirm(`Avanzar ${total} ticket(s) ${STAGE_LABEL[fromStatus]}?`)) return

    startTransition(async () => {
      const fd = new FormData()
      fd.set('fromStatus', fromStatus)
      const res = await bulkAdvanceFeedbackStatusAction(null, fd)
      if ('error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success(`${res.count ?? 0} ticket(s) avanzados`)
      }
    })
  }

  const total = counts.open + counts.triaged + counts.in_progress
  if (total === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed bg-muted/40 p-2 text-xs">
      <span className="px-1 font-medium text-muted-foreground">Acciones en bloque:</span>
      {(['open', 'triaged', 'in_progress'] as const).map((s) => {
        const count = counts[s]
        if (count === 0) return null
        return (
          <button
            key={s}
            type="button"
            onClick={() => handleBulkAdvance(s)}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 font-medium hover:bg-accent disabled:opacity-50"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
            {count} {STAGE_LABEL[s]}
          </button>
        )
      })}
    </div>
  )
}
