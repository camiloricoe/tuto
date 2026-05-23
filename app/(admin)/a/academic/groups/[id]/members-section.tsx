'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, UserMinus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  addGroupMemberAction,
  removeGroupMemberAction,
} from '@/app/actions/academic/groups'

type Member = {
  id: string
  studentId: string
  fullName: string
  documentType: string | null
  documentNumber: string | null
  joinedAt: string
}

type AvailableStudent = {
  id: string
  fullName: string
  documentNumber: string | null
}

type Props = {
  groupId: string
  members: Member[]
  availableStudents: AvailableStudent[]
  canManage: boolean
}

export function GroupMembersSection({
  groupId,
  members,
  availableStudents,
  canManage,
}: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, pending] = useActionState(addGroupMemberAction, null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!state) return
    if ('error' in state && state.error) {
      toast.error(state.error)
    } else if ('success' in state && state.success) {
      toast.success('Miembro agregado')
      formRef.current?.reset()
      router.refresh()
    }
  }, [state, router])

  function handleRemove(memberId: string) {
    setRemovingId(memberId)
    startTransition(async () => {
      const res = await removeGroupMemberAction(memberId)
      setRemovingId(null)
      if (res && 'error' in res && res.error) {
        toast.error(res.error)
        return
      }
      toast.success('Miembro removido')
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          El grupo no tiene miembros activos.
        </p>
      ) : (
        <ul className="space-y-1">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">{m.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {m.documentType && m.documentNumber
                    ? `${m.documentType} ${m.documentNumber}`
                    : 'Sin documento'}
                </p>
              </div>
              {canManage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(m.id)}
                  disabled={isPending && removingId === m.id}
                  className="gap-1"
                >
                  {isPending && removingId === m.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserMinus className="h-4 w-4" />
                  )}
                  Remover
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <form
          ref={formRef}
          action={formAction}
          className="flex flex-wrap items-end gap-2 border-t border-border pt-4"
        >
          <input type="hidden" name="groupId" value={groupId} />
          <div className="min-w-[240px] flex-1 space-y-1">
            <Label htmlFor="studentId">Agregar estudiante</Label>
            <select
              id="studentId"
              name="studentId"
              required
              disabled={availableStudents.length === 0 || pending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Seleccionar estudiante...</option>
              {availableStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                  {s.documentNumber ? ` (${s.documentNumber})` : ''}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={pending || availableStudents.length === 0}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Agregando...
              </>
            ) : (
              'Agregar'
            )}
          </Button>
          {availableStudents.length === 0 && (
            <p className="w-full text-xs text-muted-foreground">
              No hay estudiantes disponibles para agregar.
            </p>
          )}
        </form>
      )}
    </div>
  )
}
