'use client'

import { useActionState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { addFeedbackCommentAction } from '@/app/actions/feedback'

export function CommentForm({ ticketId, canMarkInternal }: { ticketId: string; canMarkInternal: boolean }) {
  const [state, action, pending] = useActionState(addFeedbackCommentAction, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={action} className="space-y-2 border-t pt-4">
      <input type="hidden" name="ticketId" value={ticketId} />
      <textarea
        name="body"
        required
        rows={3}
        placeholder="Escribir comentario..."
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <div className="flex items-center justify-between gap-2">
        {canMarkInternal ? (
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" name="isInternal" value="true" />
            Comentario interno (no visible al usuario)
          </label>
        ) : (
          <span />
        )}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Enviando...' : 'Comentar'}
        </Button>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  )
}
