'use client'

import { useActionState } from 'react'
import { updatePeriodAction } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

type Defaults = {
  name: string
  code: string
  kind: string
  starts_on: string
  ends_on: string
  active: boolean
}

export default function EditPeriodForm({ periodId, defaults }: { periodId: string; defaults: Defaults }) {
  const [state, action, pending] = useActionState(updatePeriodAction, null)

  return (
    <Card className="glass">
      <CardContent className="pt-6">
        <form action={action} className="space-y-4">
          <input type="hidden" name="periodId" value={periodId} />

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" defaultValue={defaults.name} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Codigo</Label>
            <Input id="code" name="code" defaultValue={defaults.code} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kind">Tipo</Label>
            <select
              id="kind"
              name="kind"
              required
              defaultValue={defaults.kind}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="bimester">Bimestre</option>
              <option value="trimester">Trimestre</option>
              <option value="quadrimester">Cuatrimestre</option>
              <option value="semester">Semestre</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="starts_on">Fecha inicio</Label>
            <Input id="starts_on" name="starts_on" type="date" defaultValue={defaults.starts_on} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ends_on">Fecha fin</Label>
            <Input id="ends_on" name="ends_on" type="date" defaultValue={defaults.ends_on} required />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="active"
              name="active"
              type="checkbox"
              value="true"
              defaultChecked={defaults.active}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="active" className="cursor-pointer font-normal">
              Periodo activo
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
