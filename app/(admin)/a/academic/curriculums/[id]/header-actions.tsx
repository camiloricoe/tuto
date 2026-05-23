'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  publishCurriculumAction,
  archiveCurriculumAction,
  deleteCurriculumAction,
} from '@/app/actions/academic/curriculums'

type Props = {
  curriculumId: string
  status: string
  subjectCount: number
}

export function CurriculumHeaderActions({ curriculumId, status, subjectCount }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  function run(label: string, fn: () => Promise<{ error?: string; success?: boolean }>) {
    if (!confirm(`${label}: ¿confirmas la accion?`)) return
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res && 'error' in res && res.error) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      setTimeout(() => setConfirmingDelete(false), 4_000)
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await deleteCurriculumAction(curriculumId)
      if (res && 'error' in res && res.error) {
        setError(res.error)
        setConfirmingDelete(false)
        return
      }
      router.push('/a/academic/curriculums')
    })
  }

  const canPublish = status === 'draft' && subjectCount > 0
  const canArchive = status === 'published'
  const canDelete = status === 'draft'

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {canPublish && (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() =>
              run('Publicar pensum', () => publishCurriculumAction(curriculumId))
            }
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publicar'}
          </Button>
        )}
        {status === 'draft' && subjectCount === 0 && (
          <span className="text-xs text-muted-foreground">
            Agrega materias para publicar
          </span>
        )}
        {canArchive && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              run('Archivar pensum', () => archiveCurriculumAction(curriculumId))
            }
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Archivar'}
          </Button>
        )}
        {canDelete && (
          <Button
            type="button"
            variant={confirmingDelete ? 'destructive' : 'outline'}
            size="sm"
            disabled={pending}
            onClick={handleDelete}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : confirmingDelete ? (
              'Confirmar?'
            ) : (
              'Eliminar'
            )}
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
