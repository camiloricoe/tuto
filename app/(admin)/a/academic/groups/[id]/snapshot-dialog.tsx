'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Camera, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { snapshotCurriculumIntoGroupAction } from '@/app/actions/academic/groups'

type PublishedCurriculum = {
  id: string
  name: string
  version: string
}

type Props = {
  groupId: string
  publishedCurriculums: PublishedCurriculum[]
}

export function SnapshotDialog({ groupId, publishedCurriculums }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [curriculumId, setCurriculumId] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleApply() {
    if (!curriculumId) {
      toast.error('Selecciona un pensum')
      return
    }
    startTransition(async () => {
      const res = await snapshotCurriculumIntoGroupAction(groupId, curriculumId)
      if (res && 'error' in res && res.error) {
        toast.error(res.error)
        return
      }
      const copied = res && 'copied' in res ? res.copied : 0
      toast.success(`Pensum aplicado (${copied} materias copiadas)`)
      setOpen(false)
      setCurriculumId('')
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Camera className="h-4 w-4" /> Aplicar pensum
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aplicar pensum al grupo</DialogTitle>
          <DialogDescription>
            Se copiaran las materias del pensum publicado al plan del grupo. Esta accion
            no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="snapshotCurriculumId">Pensum publicado</Label>
          <select
            id="snapshotCurriculumId"
            value={curriculumId}
            onChange={(e) => setCurriculumId(e.target.value)}
            disabled={isPending || publishedCurriculums.length === 0}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">Seleccionar pensum...</option>
            {publishedCurriculums.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (v{c.version})
              </option>
            ))}
          </select>
          {publishedCurriculums.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Este programa no tiene pensums publicados.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={isPending || !curriculumId}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Aplicando...
              </>
            ) : (
              'Aplicar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
