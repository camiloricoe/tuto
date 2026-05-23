import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { getCourses } from '@/lib/db/academic'
import { getTenantTerms } from '@/lib/terminology/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CourseRowActions } from './row-actions'

export default async function CoursesPage() {
  const session = await requireSession()
  await requirePermission('academic:read')

  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }

  const [courses, terms] = await Promise.all([
    getCourses(session.activeTenantId),
    getTenantTerms(session.activeTenantId),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{terms.course.plural}</h1>
        {session.permissions.has('academic:write') && (
          <Button asChild>
            <a href="/a/academic/courses/new">Nuevo {terms.course.singular.toLowerCase()}</a>
          </Button>
        )}
      </div>

      <div className="grid gap-3">
        {courses.map((course) => {
          const subject = course.subjects as unknown as { name: string; code: string } | null
          const period = course.academic_periods as unknown as { name: string; code: string } | null
          return (
            <Card key={course.id} className="glass-subtle">
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="font-medium">{subject?.name ?? `Sin ${terms.subject.singular.toLowerCase()}`}</p>
                  <p className="text-sm text-muted-foreground">
                    {subject?.code} · {period?.name} · Seccion: {course.section_code || 'A'}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">Estado: {course.status}</p>
                </div>
                <CourseRowActions
                  courseId={course.id}
                  canWrite={session.permissions.has('academic:write')}
                />
              </CardContent>
            </Card>
          )
        })}
        {courses.length === 0 && (
          <p className="text-muted-foreground">No hay {terms.course.plural.toLowerCase()} registrados.</p>
        )}
      </div>
    </div>
  )
}
