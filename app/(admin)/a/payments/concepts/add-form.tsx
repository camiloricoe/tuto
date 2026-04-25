'use client'

import { useActionState } from 'react'
import { createPaymentConceptAction } from '@/app/actions/payments/concepts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AddConceptForm() {
  const [state, formAction, pending] = useActionState(createPaymentConceptAction, null)

  return (
    <form action={formAction} className="space-y-4">
      <h2 className="text-base font-medium">Agregar concepto</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" name="name" placeholder="Ej: Matricula" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="code">Codigo</Label>
          <Input id="code" name="code" placeholder="Ej: MATRICULA" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="defaultAmount">Monto por defecto</Label>
          <Input
            id="defaultAmount"
            name="defaultAmount"
            type="number"
            min={0}
            step="0.01"
            placeholder="Ej: 500.00"
          />
        </div>
        <div className="flex items-end space-y-1">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="recurring" value="true" className="rounded" />
            Recurrente
          </label>
        </div>
      </div>

      {state && 'error' in state && state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state && 'success' in state && state.success && (
        <p className="text-sm text-green-600">Concepto creado exitosamente.</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Guardando...' : 'Agregar concepto'}
      </Button>
    </form>
  )
}
