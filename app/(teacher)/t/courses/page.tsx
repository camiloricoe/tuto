import { requireSession } from '@/lib/auth/session'
import { getTeacherCourses } from '@/lib/db/academic'
import { Card, CardContent } from '@/components/ui/card'

export default async function TeacherCoursesPage() {
  const session = await requireSession()

  const courses = await getTeacherCourses(session.activeTenantId ?? '', session.userId)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Mis Cursos</h1>

      <div className="grid gap-3">
        {courses.map((course) => {
          const subject = course.subjects as unknown as { name: string; code: string } | null
          const period = course.academic_periods as unknown as { name: string } | null
          return (
            <a key={course.id} href={`/t/courses/${course.id}`}>
              <Card className="glass-subtle transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{subject?.name ?? 'Sin materia'}</p>
                    <p className="text-sm text-muted-foreground">
                      {subject?.code} · {period?.name}
                      {course.section_code ? ` · Sec. ${course.section_code}` : ''}
                    </p>
                  </div>
                  <p className="text-xs capitalize text-muted-foreground">{course.status}</p>
                </CardContent>
              </Card>
            </a>
          )
        })}
        {courses.length === 0 && (
          <p className="text-muted-foreground">No tienes cursos asignados.</p>
        )}
      </div>
    </div>
  )
}
