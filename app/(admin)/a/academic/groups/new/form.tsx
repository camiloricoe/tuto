'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createGroupAction } from '@/app/actions/academic/groups'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Program = { id: string; name: string; code: string }
type Curriculum = { id: string; name: string; version: string }

type Props = {
  programs: Program[]
  curriculumsByProgram: Record<string, Curriculum[]>
}

export default function NewGroupForm({ programs, curriculumsByProgram }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(createGroupAction, null)
  const [programId, setProgramId] = useState<string>('')

  const currentYear = new Date().getFullYear()
  const availableCurriculums = programId ? curriculumsByProgram[programId] ?? [] : []

  useEffect(() => {
    if (state && 'success' in state && state.success && 'id' in state && state.id) {
      router.push(`/a/academic/groups/${state.id}`)
    }
  }, [state, router])

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base">Datos del grupo</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="programId">Programa</Label>
            <select
              id="programId"
              name="programId"
              required
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Seleccionar programa...</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" placeholder="Ej: Cohorte 2026-A" required />
          </div>

          <div className="space-y-1">
            <Label htmlFor="code">Codigo (opcional)</Label>
            <Input id="code" name="code" placeholder="Ej: 2026A" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="intakeYear">Anio de ingreso</Label>
              <Input
                id="intakeYear"
                name="intakeYear"
                type="number"
                min={2000}
                max={2100}
                defaultValue={currentYear}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="intakePeriod">Periodo (opcional)</Label>
              <Input id="intakePeriod" name="intakePeriod" placeholder="Ej: A" />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="currentCycle">Ciclo actual</Label>
            <Input
              id="currentCycle"
              name="currentCycle"
              type="number"
              min={1}
              defaultValue={1}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input id="notes" name="notes" placeholder="Notas internas" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="curriculumId">Pensum (opcional)</Label>
            <select
              id="curriculumId"
              name="curriculumId"
              disabled={!programId || availableCurriculums.length === 0}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Sin pensum</option>
              {availableCurriculums.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (v{c.version})
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {programId && availableCurriculums.length === 0
                ? 'Este programa no tiene pensums publicados.'
                : 'Si eliges un pensum, se copiara el plan al grupo automaticamente.'}
            </p>
          </div>

          {state && 'error' in state && state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state && 'warning' in state && state.warning && (
            <p className="text-sm text-destructive">
              Grupo creado, pero hubo un problema al aplicar el pensum: {state.warning}
            </p>
          )}
          {state && 'success' in state && state.success && (
            <p className="text-sm text-primary">Grupo creado exitosamente.</p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Creando...' : 'Crear grupo'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
