import { requireSession } from '@/lib/auth/session'
import { getStudentEnrollments } from '@/lib/db/academic'
import { Card, CardContent } from '@/components/ui/card'

export default async function StudentCoursesPage() {
  const session = await requireSession()

  const enrollments = await getStudentEnrollments(session.activeTenantId ?? '', session.userId)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Mis Cursos</h1>

      <div className="grid gap-3">
        {enrollments.map((enrollment) => {
          const course = enrollment.courses as unknown as {
            id: string
            section_code: string
            status: string
            subjects: { name: string; code: string } | null
            academic_periods: { name: string } | null
          } | null
          return (
            <Card key={enrollment.id} className="glass-subtle">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{course?.subjects?.name ?? 'Sin materia'}</p>
                  <p className="text-sm text-muted-foreground">
                    {course?.subjects?.code} · {course?.academic_periods?.name}
                    {course?.section_code ? ` · Sec. ${course.section_code}` : ''}
                  </p>
                </div>
                <p className="text-xs capitalize text-muted-foreground">{enrollment.status}</p>
              </CardContent>
            </Card>
          )
        })}
        {enrollments.length === 0 && (
          <p className="text-muted-foreground">No tienes cursos inscritos.</p>
        )}
      </div>
    </div>
  )
}
