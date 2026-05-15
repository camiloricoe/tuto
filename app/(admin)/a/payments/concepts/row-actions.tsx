'use client'

import { DeleteButton } from '@/components/shared/delete-button'
import { deletePaymentConceptAction } from '@/app/actions/payments/concepts'

export function ConceptRowActions({ conceptId, canWrite }: { conceptId: string; canWrite: boolean }) {
  if (!canWrite) return null
  return (
    <DeleteButton action={async () => deletePaymentConceptAction(conceptId)} />
  )
}
