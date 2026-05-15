'use client'

import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeleteButton } from '@/components/shared/delete-button'
import {
  deletePeriodAction,
  deleteGradingSchemeAction,
  deleteSubjectAction,
} from '@/app/actions/settings'

function EditLink({ href }: { href: string }) {
  return (
    <Button asChild variant="outline" size="sm" className="gap-1">
      <Link href={href as never}>
        <Pencil className="h-4 w-4" />
        Editar
      </Link>
    </Button>
  )
}

export function PeriodRowActions({ id, canWrite }: { id: string; canWrite: boolean }) {
  if (!canWrite) return null
  return (
    <div className="flex items-center gap-2">
      <EditLink href={`/a/settings/periods/${id}/edit`} />
      <DeleteButton action={async () => deletePeriodAction(id)} />
    </div>
  )
}

export function SchemeRowActions({ id, canWrite }: { id: string; canWrite: boolean }) {
  if (!canWrite) return null
  return (
    <div className="flex items-center gap-2">
      <EditLink href={`/a/settings/schemes/${id}/edit`} />
      <DeleteButton action={async () => deleteGradingSchemeAction(id)} />
    </div>
  )
}

export function SubjectRowActions({ id, canWrite }: { id: string; canWrite: boolean }) {
  if (!canWrite) return null
  return (
    <div className="flex items-center gap-2">
      <EditLink href={`/a/settings/subjects/${id}/edit`} />
      <DeleteButton action={async () => deleteSubjectAction(id)} />
    </div>
  )
}
