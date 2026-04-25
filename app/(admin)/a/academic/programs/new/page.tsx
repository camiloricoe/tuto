'use client'

import { useActionState } from 'react'
import { createProgramAction } from '@/app/actions/academic/programs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewProgramPage() {
  const [state, formAction, pending] = useActionState(createProgramAction, null)

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Nuevo Programa</h1>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">Datos del programa</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" placeholder="Ej: Ingenieria de Sistemas" required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="code">Codigo</Label>
              <Input id="code" name="code" placeholder="Ej: ING_SIS" required />
              <p className="text-xs text-muted-foreground">Solo mayusculas, numeros y guiones</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="modality">Modalidad</Label>
              <select
                id="modality"
                name="modality"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Seleccionar...</option>
                <option value="presencial">Presencial</option>
                <option value="virtual">Virtual</option>
                <option value="hibrido">Hibrido</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="durationPeriods">Duracion (periodos)</Label>
              <Input
                id="durationPeriods"
                name="durationPeriods"
                type="number"
                min={1}
                placeholder="Ej: 8"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Descripcion (opcional)</Label>
              <Input id="description" name="description" placeholder="Descripcion del programa" />
            </div>

            {state && 'error' in state && state.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            {state && 'success' in state && state.success && (
              <p className="text-sm text-green-600">Programa creado exitosamente.</p>
            )}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? 'Creando...' : 'Crear programa'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
