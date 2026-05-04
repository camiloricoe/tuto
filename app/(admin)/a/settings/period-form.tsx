'use client'

import { useActionState } from 'react'
import { createPeriodAction } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function PeriodForm() {
  const [state, action, pending] = useActionState(createPeriodAction, null)

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="period-name">Nombre</Label>
        <Input id="period-name" name="name" required placeholder="Primer Semestre 2025" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="period-code">Codigo</Label>
        <Input id="period-code" name="code" required placeholder="2025-1" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="period-kind">Tipo</Label>
        <select
          id="period-kind"
          name="kind"
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Seleccionar tipo</option>
          <option value="bimester">Bimestre</option>
          <option value="trimester">Trimestre</option>
          <option value="quadrimester">Cuatrimestre</option>
          <option value="semester">Semestre</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="period-starts">Fecha inicio</Label>
        <Input id="period-starts" name="starts_on" type="date" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="period-ends">Fecha fin</Label>
        <Input id="period-ends" name="ends_on" type="date" required />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && (
        <p className="text-sm text-green-600">Periodo creado correctamente.</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Creando...' : 'Crear periodo'}
      </Button>
    </form>
  )
}
