'use client'

import { useActionState } from 'react'
import { updateGradingSchemeAction } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

type Defaults = {
  name: string
  scale_min: number
  scale_max: number
  passing_grade: number
  uses_letters: boolean
}

export default function EditSchemeForm({ schemeId, defaults }: { schemeId: string; defaults: Defaults }) {
  const [state, action, pending] = useActionState(updateGradingSchemeAction, null)

  return (
    <Card className="glass">
      <CardContent className="pt-6">
        <form action={action} className="space-y-4">
          <input type="hidden" name="schemeId" value={schemeId} />

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" defaultValue={defaults.name} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="scale_min">Minimo</Label>
              <Input id="scale_min" name="scale_min" type="number" defaultValue={defaults.scale_min} required min="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scale_max">Maximo</Label>
              <Input id="scale_max" name="scale_max" type="number" defaultValue={defaults.scale_max} required min="1" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passing_grade">Nota de aprobacion</Label>
            <Input
              id="passing_grade"
              name="passing_grade"
              type="number"
              defaultValue={defaults.passing_grade}
              required
              min="0"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="uses_letters"
              name="uses_letters"
              type="checkbox"
              value="true"
              defaultChecked={defaults.uses_letters}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="uses_letters" className="cursor-pointer font-normal">
              Usar letras (A, B, C...)
            </Label>
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
