'use client'

import { useActionState } from 'react'
import { createSubjectAction } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Program = {
  id: string
  name: string
}

export function SubjectForm({ programs }: { programs: Program[] }) {
  const [state, action, pending] = useActionState(createSubjectAction, null)

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="subject-name">Nombre</Label>
        <Input id="subject-name" name="name" required placeholder="Matematicas I" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subject-code">Codigo</Label>
        <Input id="subject-code" name="code" required placeholder="MAT101" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subject-program">Programa</Label>
        <select
          id="subject-program"
          name="program_id"
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Seleccionar programa</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {programs.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No hay programas disponibles. Crea uno primero.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="subject-credits">Creditos (opcional)</Label>
        <Input
          id="subject-credits"
          name="credits"
          type="number"
          min="0"
          placeholder="3"
        />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && (
        <p className="text-sm text-green-600">Materia creada correctamente.</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Creando...' : 'Crear materia'}
      </Button>
    </form>
  )
}
