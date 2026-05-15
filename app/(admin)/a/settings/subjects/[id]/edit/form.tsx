'use client'

import { useActionState } from 'react'
import { updateSubjectAction } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

type Defaults = {
  name: string
  code: string
  program_id: string
  credits: number | null
}

export default function EditSubjectForm({
  subjectId,
  defaults,
  programs,
}: {
  subjectId: string
  defaults: Defaults
  programs: Array<{ id: string; name: string }>
}) {
  const [state, action, pending] = useActionState(updateSubjectAction, null)

  return (
    <Card className="glass">
      <CardContent className="pt-6">
        <form action={action} className="space-y-4">
          <input type="hidden" name="subjectId" value={subjectId} />

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" defaultValue={defaults.name} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Codigo</Label>
            <Input id="code" name="code" defaultValue={defaults.code} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="program_id">Programa</Label>
            <select
              id="program_id"
              name="program_id"
              required
              defaultValue={defaults.program_id}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="credits">Creditos (opcional)</Label>
            <Input
              id="credits"
              name="credits"
              type="number"
              min="0"
              defaultValue={defaults.credits ?? ''}
            />
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state?.success && <p className="text-sm text-green-600">Cambios guardados.</p>}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
