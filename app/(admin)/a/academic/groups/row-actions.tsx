'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Archive, MoreHorizontal, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { archiveGroupAction, deleteGroupAction } from '@/app/actions/academic/groups'

type Props = {
  groupId: string
  canWrite: boolean
}

export function GroupRowActions({ groupId, canWrite }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleArchive() {
    startTransition(async () => {
      const res = await archiveGroupAction(groupId)
      if (res && 'error' in res && res.error) {
        alert(res.error)
        return
      }
      router.refresh()
    })
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 4_000)
      return
    }
    startTransition(async () => {
      const res = await deleteGroupAction(groupId)
      if (res && 'error' in res && res.error) {
        alert(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <Link href={`/a/academic/groups/${groupId}`}>
            <Eye className="h-4 w-4" /> Ver
          </Link>
        </DropdownMenuItem>
        {canWrite && (
          <>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleArchive() }}>
              <Archive className="h-4 w-4" /> Archivar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => { e.preventDefault(); handleDelete() }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {confirmDelete ? 'Confirmar?' : 'Eliminar'}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
