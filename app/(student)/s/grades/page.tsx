import { requireSession } from '@/lib/auth/session'
import { getStudentEnrollments, getStudentGrades } from '@/lib/db/academic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function StudentGradesPage() {
  const session = await requireSession()

  const enrollments = await getStudentEnrollments(session.activeTenantId ?? '', session.userId)
  const publishedEnrollments = enrollments.filter((e) => e.final_grade != null)

  // Fetch grades for all enrollments with published grades
  const enrollmentsWithGrades = await Promise.all(
    publishedEnrollments.map(async (enrollment) => {
      const grades = await getStudentGrades(session.activeTenantId ?? '', enrollment.id)
      const published = grades.filter((g) => g.status === 'published')
      return { enrollment, grades: published }
    }),
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Mis Calificaciones</h1>

      {enrollmentsWithGrades.length === 0 && (
        <p className="text-muted-foreground">No hay calificaciones publicadas aun.</p>
      )}

      {enrollmentsWithGrades.map(({ enrollment, grades }) => {
        const course = enrollment.courses as unknown as {
          subjects: { name: string; code: string } | null
          academic_periods: { name: string } | null
        } | null

        return (
          <Card key={enrollment.id} className="glass">
            <CardHeader>
              <CardTitle className="text-base">
                {course?.subjects?.name ?? 'Curso'}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {course?.academic_periods?.name}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {grades.map((grade) => {
                  const evaluation = grade.course_evaluations as unknown as {
                    name: string
                    weight: number
                  } | null
                  return (
                    <div
                      key={grade.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">{evaluation?.name ?? 'Evaluacion'}</span>
                      <span className="font-medium">
                        {grade.value.toFixed(1)}
                        {grade.letter ? ` (${grade.letter})` : ''}
                      </span>
                    </div>
                  )
                })}
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="font-medium">Nota final</span>
                  <span className="text-lg font-semibold">
                    {enrollment.final_grade?.toFixed(1) ?? '—'}
                    {enrollment.final_letter ? ` (${enrollment.final_letter})` : ''}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
