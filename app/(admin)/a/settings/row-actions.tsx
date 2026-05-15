'use client'

import { DeleteButton } from '@/components/shared/delete-button'
import {
  deletePeriodAction,
  deleteGradingSchemeAction,
  deleteSubjectAction,
} from '@/app/actions/settings'

export function PeriodRowActions({ id, canWrite }: { id: string; canWrite: boolean }) {
  if (!canWrite) return null
  return <DeleteButton action={async () => deletePeriodAction(id)} />
}

export function SchemeRowActions({ id, canWrite }: { id: string; canWrite: boolean }) {
  if (!canWrite) return null
  return <DeleteButton action={async () => deleteGradingSchemeAction(id)} />
}

export function SubjectRowActions({ id, canWrite }: { id: string; canWrite: boolean }) {
  if (!canWrite) return null
  return <DeleteButton action={async () => deleteSubjectAction(id)} />
}
