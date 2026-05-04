'use client'

import { useActionState } from 'react'
import { createGradingSchemeAction } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function GradingSchemeForm() {
  const [state, action, pending] = useActionState(createGradingSchemeAction, null)

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="scheme-name">Nombre</Label>
        <Input id="scheme-name" name="name" required placeholder="Escala 0-100" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="scheme-min">Minimo</Label>
          <Input
            id="scheme-min"
            name="scale_min"
            type="number"
            required
            defaultValue="0"
            min="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="scheme-max">Maximo</Label>
          <Input
            id="scheme-max"
            name="scale_max"
            type="number"
            required
            defaultValue="100"
            min="1"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="scheme-passing">Nota de aprobacion</Label>
        <Input
          id="scheme-passing"
          name="passing_grade"
          type="number"
          required
          defaultValue="60"
          min="0"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="scheme-letters"
          name="uses_letters"
          type="checkbox"
          value="true"
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="scheme-letters" className="cursor-pointer font-normal">
          Usar letras (A, B, C...)
        </Label>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && (
        <p className="text-sm text-green-600">Esquema creado correctamente.</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Creando...' : 'Crear esquema'}
      </Button>
    </form>
  )
}
