'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { MoreVertical, ExternalLink, CheckCircle2, Archive, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  publishCurriculumAction,
  archiveCurriculumAction,
  deleteCurriculumAction,
} from '@/app/actions/academic/curriculums'

type Props = {
  curriculumId: string
  status: string
  canWrite: boolean
}

export function CurriculumRowActions({ curriculumId, status, canWrite }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(label: string, fn: () => Promise<{ error?: string; success?: boolean }>) {
    if (!confirm(`${label}: ¿confirmas la accion?`)) return
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res && 'error' in res && res.error) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={pending} aria-label="Acciones">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/a/academic/curriculums/${curriculumId}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir
            </Link>
          </DropdownMenuItem>
          {canWrite && status === 'draft' && (
            <DropdownMenuItem
              onSelect={() =>
                run('Publicar pensum', () => publishCurriculumAction(curriculumId))
              }
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Publicar
            </DropdownMenuItem>
          )}
          {canWrite && status === 'published' && (
            <DropdownMenuItem
              onSelect={() =>
                run('Archivar pensum', () => archiveCurriculumAction(curriculumId))
              }
            >
              <Archive className="mr-2 h-4 w-4" />
              Archivar
            </DropdownMenuItem>
          )}
          {canWrite && status === 'draft' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() =>
                  run('Eliminar pensum', () => deleteCurriculumAction(curriculumId))
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
