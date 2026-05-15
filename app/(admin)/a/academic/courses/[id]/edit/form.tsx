'use client'

import { useActionState } from 'react'
import { updateCourseAction } from '@/app/actions/academic/courses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

type Subject = { id: string; name: string; code: string }
type Period = { id: string; name: string; code: string }
type Scheme = { id: string; name: string }

type Props = {
  courseId: string
  subjects: Subject[]
  periods: Period[]
  schemes: Scheme[]
  defaults: {
    subjectId: string
    periodId: string
    gradingSchemeId: string
    sectionCode: string
    maxStudents: number | null
  }
}

export default function EditCourseForm({ courseId, subjects, periods, schemes, defaults }: Props) {
  const [state, action, pending] = useActionState(updateCourseAction, null)

  return (
    <Card className="glass">
      <CardContent className="pt-6">
        <form action={action} className="space-y-4">
          <input type="hidden" name="courseId" value={courseId} />

          <div className="space-y-1">
            <Label htmlFor="subjectId">Materia</Label>
            <select
              id="subjectId"
              name="subjectId"
              required
              defaultValue={defaults.subjectId}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
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
              defaultValue={defaults.periodId}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="gradingSchemeId">Esquema</Label>
            <select
              id="gradingSchemeId"
              name="gradingSchemeId"
              required
              defaultValue={defaults.gradingSchemeId}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {schemes.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="sectionCode">Codigo de seccion</Label>
            <Input id="sectionCode" name="sectionCode" defaultValue={defaults.sectionCode} placeholder="A" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="maxStudents">Cupo maximo</Label>
            <Input
              id="maxStudents"
              name="maxStudents"
              type="number"
              min={1}
              defaultValue={defaults.maxStudents ?? ''}
            />
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
