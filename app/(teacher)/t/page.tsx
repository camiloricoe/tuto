import { requireSession } from '@/lib/auth/session'
import { getTeacherCourses } from '@/lib/db/academic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Users, ArrowRight } from 'lucide-react'

export default async function TeacherDashboard() {
  const session = await requireSession()
  const tenantId = session.activeTenantId

  const courses = await getTeacherCourses(tenantId ?? '', session.userId)
  const activeCourses = courses.filter((c) => c.status === 'active')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bienvenido, {session.profile.fullName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeCourses.length > 0
            ? `Tienes ${activeCourses.length} curso${activeCourses.length === 1 ? '' : 's'} activo${activeCourses.length === 1 ? '' : 's'}`
            : 'No tienes cursos activos en este momento'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="glass-subtle">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cursos activos
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeCourses.length}</p>
          </CardContent>
        </Card>

        <Card className="glass-subtle">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total cursos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{courses.length}</p>
          </CardContent>
        </Card>
      </div>

      {courses.length > 0 && (
        <Card className="glass-subtle">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Mis cursos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {courses.map((course) => {
                const subject = Array.isArray(course.subjects)
                  ? course.subjects[0]
                  : course.subjects
                const period = Array.isArray(course.academic_periods)
                  ? course.academic_periods[0]
                  : course.academic_periods

                return (
                  <li key={course.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="text-sm font-medium">
                        {subject?.name ?? 'Sin materia'}{' '}
                        <span className="text-muted-foreground">— {course.section_code}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {period?.name ?? ''} · {course.status}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/t/courses/${course.id}`}>
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </Button>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
