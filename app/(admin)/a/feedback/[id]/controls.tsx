'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { updateFeedbackStatusAction } from '@/app/actions/feedback'
import {
  FEEDBACK_STATUSES,
  FEEDBACK_PRIORITIES,
  type FeedbackStatus,
  type FeedbackPriority,
} from '@/lib/validators/feedback'

type Props = {
  ticketId: string
  status: string
  priority: string
  assignedTo: string | null
  assignableUsers: Array<{ id: string; full_name: string }>
  canManage: boolean
}

export function TicketControls({ ticketId, status, priority, assignedTo, assignableUsers, canManage }: Props) {
  const [state, action, pending] = useActionState(updateFeedbackStatusAction, null)

  if (!canManage) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Status: <span className="font-semibold text-foreground">{status}</span>
        {' · '}Prioridad: <span className="font-semibold text-foreground">{priority}</span>
      </div>
    )
  }

  return (
    <form action={action} className="rounded-lg border bg-card p-4 space-y-3">
      <input type="hidden" name="ticketId" value={ticketId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-muted-foreground">Status</span>
          <select name="status" defaultValue={status} className="h-9 rounded-md border bg-background px-3 text-sm">
            {FEEDBACK_STATUSES.map((s: FeedbackStatus) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-muted-foreground">Prioridad</span>
          <select name="priority" defaultValue={priority} className="h-9 rounded-md border bg-background px-3 text-sm">
            {FEEDBACK_PRIORITIES.map((s: FeedbackPriority) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-muted-foreground">Asignar a</span>
          <select name="assignedTo" defaultValue={assignedTo ?? ''} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">Sin asignar</option>
            {assignableUsers.map((u) => (<option key={u.id} value={u.id}>{u.full_name}</option>))}
          </select>
        </label>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">Actualizado.</p>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </form>
  )
}
