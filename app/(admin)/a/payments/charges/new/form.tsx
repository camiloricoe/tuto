'use client'

import { useActionState, useEffect, useState } from 'react'
import { createChargeAction } from '@/app/actions/payments/charges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Student = {
  id: string
  full_name: string
}

type Concept = {
  id: string
  name: string
  code: string
  default_amount: number | null
  recurring: boolean
}

type Props = {
  students: Student[]
  concepts: Concept[]
}

export default function NewChargeForm({ students, concepts }: Props) {
  const [state, formAction, pending] = useActionState(createChargeAction, null)
  const [selectedAmount, setSelectedAmount] = useState('')

  useEffect(() => {
    if (state && 'success' in state && state.success) {
      window.location.href = '/a/payments/charges'
    }
  }, [state])

  function handleConceptChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const concept = concepts.find((c) => c.id === e.target.value)
    if (concept?.default_amount != null) {
      setSelectedAmount(concept.default_amount.toFixed(2))
    } else {
      setSelectedAmount('')
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="studentId">Estudiante</Label>
          <select
            id="studentId"
            name="studentId"
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Selecciona un estudiante</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="conceptId">Concepto</Label>
          <select
            id="conceptId"
            name="conceptId"
            required
            onChange={handleConceptChange}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Selecciona un concepto</option>
            {concepts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="amount">Monto</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            required
            value={selectedAmount}
            onChange={(e) => setSelectedAmount(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="dueDate">Fecha de vencimiento</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            required
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="notes">Notas (opcional)</Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Observaciones adicionales..."
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      {state && 'error' in state && state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando...' : 'Crear cargo'}
        </Button>
        <Button type="button" variant="outline" onClick={() => { window.location.href = '/a/payments/charges' }}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
