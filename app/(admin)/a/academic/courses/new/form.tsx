'use client'

import { useActionState } from 'react'
import { createCourseAction } from '@/app/actions/academic/courses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Subject = { id: string; name: string; code: string }
type Period = { id: string; name: string; code: string }
type Scheme = { id: string; name: string }

type Props = {
  subjects: Subject[]
  periods: Period[]
  schemes: Scheme[]
}

export default function NewCourseForm({ subjects, periods, schemes }: Props) {
  const [state, formAction, pending] = useActionState(createCourseAction, null)

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base">Datos del curso</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="subjectId">Materia</Label>
            <select
              id="subjectId"
              name="subjectId"
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Seleccionar materia...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="periodId">Periodo</Label>
            <select
              id="periodId"
              name="periodId"
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Seleccionar periodo...</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="gradingSchemeId">Esquema de calificacion</Label>
            <select
              id="gradingSchemeId"
              name="gradingSchemeId"
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Seleccionar esquema...</option>
              {schemes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="sectionCode">Codigo de seccion (opcional)</Label>
            <Input id="sectionCode" name="sectionCode" placeholder="Ej: A" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="maxStudents">Cupo maximo (opcional)</Label>
            <Input
              id="maxStudents"
              name="maxStudents"
              type="number"
              min={1}
              placeholder="Ej: 30"
            />
          </div>

          {state && 'error' in state && state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state && 'success' in state && state.success && (
            <p className="text-sm text-green-600">Curso creado exitosamente.</p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Creando...' : 'Crear curso'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
