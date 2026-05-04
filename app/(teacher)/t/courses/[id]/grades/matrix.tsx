'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveDraftsAction, publishGradesAction } from '@/app/actions/grades'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Evaluation = {
  id: string
  name: string
  code: string
  weight: number
  sequence: number
}

type GradeRow = {
  id: string
  value: number
  status: string
  evaluation_id: string
}

type Enrollment = {
  id: string
  student_id: string
  final_grade: number | null
  final_letter: string | null
  status: string
  user_profiles: unknown
  grades: GradeRow[] | null
}

type Props = {
  courseId: string
  evaluations: Evaluation[]
  enrollments: Enrollment[]
}

export default function GradesMatrix({ courseId, evaluations, enrollments }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [publishPending, startPublishTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  // Local state: enrollmentId -> evaluationId -> value
  const [gradeValues, setGradeValues] = useState<Record<string, Record<string, string>>>(() => {
    const initial: Record<string, Record<string, string>> = {}
    for (const enrollment of enrollments) {
      initial[enrollment.id] = {}
      for (const grade of enrollment.grades ?? []) {
        const evMap = initial[enrollment.id]
        if (evMap) {
          evMap[grade.evaluation_id] = String(grade.value)
        }
      }
    }
    return initial
  })

  function handleChange(enrollmentId: string, evaluationId: string, value: string) {
    setGradeValues((prev) => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        [evaluationId]: value,
      },
    }))
  }

  function handleSave() {
    const grades: Array<{ enrollmentId: string; evaluationId: string; value: number }> = []

    for (const [enrollmentId, evMap] of Object.entries(gradeValues)) {
      for (const [evaluationId, raw] of Object.entries(evMap)) {
        const val = parseFloat(raw)
        if (!isNaN(val)) {
          grades.push({ enrollmentId, evaluationId, value: val })
        }
      }
    }

    if (grades.length === 0) {
      setMessage('No hay notas para guardar.')
      return
    }

    const formData = new FormData()
    formData.set('courseId', courseId)
    formData.set('grades', JSON.stringify(grades))

    startTransition(async () => {
      const result = await saveDraftsAction(null, formData)
      if (result && 'error' in result) {
        setMessage(result.error ?? 'Error al guardar')
      } else {
        setMessage('Notas guardadas como borrador.')
      }
    })
  }

  function handlePublish() {
    const confirmed = window.confirm(
      '¿Estás seguro de publicar todas las notas? Esta acción no se puede deshacer.',
    )
    if (!confirmed) return

    const formData = new FormData()
    formData.set('courseId', courseId)

    startPublishTransition(async () => {
      const result = await publishGradesAction(null, formData)
      if (result && 'error' in result) {
        setMessage(result.error ?? 'Error al publicar')
      } else {
        setMessage('Notas publicadas exitosamente.')
        router.refresh()
      }
    })
  }

  const getStudentName = (enrollment: Enrollment): string => {
    const profile = enrollment.user_profiles as { full_name?: string } | null
    return profile?.full_name ?? 'Sin nombre'
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 text-left font-medium text-muted-foreground">Estudiante</th>
              {evaluations.map((ev) => (
                <th key={ev.id} className="px-2 py-2 text-center font-medium text-muted-foreground">
                  <div>{ev.name}</div>
                  <div className="text-xs">({(ev.weight * 100).toFixed(0)}%)</div>
                </th>
              ))}
              <th className="px-2 py-2 text-center font-medium text-muted-foreground">Final</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((enrollment) => (
              <tr key={enrollment.id} className="border-b border-border/50">
                <td className="py-2 font-medium">{getStudentName(enrollment)}</td>
                {evaluations.map((ev) => (
                  <td key={ev.id} className="px-2 py-1 text-center">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      className="w-20 text-center"
                      value={gradeValues[enrollment.id]?.[ev.id] ?? ''}
                      onChange={(e) => handleChange(enrollment.id, ev.id, e.target.value)}
                    />
                  </td>
                ))}
                <td className="px-2 py-2 text-center text-muted-foreground">
                  {enrollment.final_grade != null ? (
                    <span>
                      {enrollment.final_grade.toFixed(1)}
                      {enrollment.final_letter ? ` (${enrollment.final_letter})` : ''}
                    </span>
                  ) : (
                    <span>—</span>
                  )}
                </td>
              </tr>
            ))}
            {enrollments.length === 0 && (
              <tr>
                <td
                  colSpan={evaluations.length + 2}
                  className="py-4 text-center text-muted-foreground"
                >
                  No hay estudiantes inscritos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleSave} disabled={pending || publishPending}>
          {pending ? 'Guardando...' : 'Guardar borradores'}
        </Button>
        <Button onClick={handlePublish} disabled={pending || publishPending}>
          {publishPending ? 'Publicando...' : 'Publicar notas'}
        </Button>
      </div>
    </div>
  )
}
