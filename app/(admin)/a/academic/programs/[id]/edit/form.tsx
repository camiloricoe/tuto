'use client'

import { useActionState } from 'react'
import { updateProgramAction } from '@/app/actions/academic/programs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  programId: string
  defaults: {
    name: string
    code: string
    modality: string
    durationPeriods: number
    description: string
  }
}

export default function EditProgramForm({ programId, defaults }: Props) {
  const [state, action, pending] = useActionState(updateProgramAction, null)

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base">Datos del programa</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="programId" value={programId} />

          <div className="space-y-1">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" defaultValue={defaults.name} required />
          </div>

          <div className="space-y-1">
            <Label htmlFor="code">Codigo</Label>
            <Input id="code" name="code" defaultValue={defaults.code} required />
          </div>

          <div className="space-y-1">
            <Label htmlFor="modality">Modalidad</Label>
            <select
              id="modality"
              name="modality"
              required
              defaultValue={defaults.modality}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="fixed_curriculum">Curriculo fijo</option>
              <option value="elective">Electivo</option>
              <option value="cohort">Cohorte</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="durationPeriods">Duracion (periodos)</Label>
            <Input
              id="durationPeriods"
              name="durationPeriods"
              type="number"
              min={1}
              defaultValue={defaults.durationPeriods}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Descripcion</Label>
            <Input id="description" name="description" defaultValue={defaults.description} />
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
