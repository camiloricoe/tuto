import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { getCourses } from '@/lib/db/academic'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function CoursesPage() {
  const session = await requireSession()
  await requirePermission('academic:read')

  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }

  const courses = await getCourses(session.activeTenantId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cursos</h1>
        {session.permissions.has('academic:write') && (
          <Button asChild>
            <a href="/a/academic/courses/new">Nuevo curso</a>
          </Button>
        )}
      </div>

      <div className="grid gap-3">
        {courses.map((course) => {
          const subject = course.subjects as unknown as { name: string; code: string } | null
          const period = course.academic_periods as unknown as { name: string; code: string } | null
          return (
            <Card key={course.id} className="glass-subtle">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{subject?.name ?? 'Sin materia'}</p>
                  <p className="text-sm text-muted-foreground">
                    {subject?.code} · {period?.name} · Seccion: {course.section_code || 'A'}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">Estado: {course.status}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {courses.length === 0 && (
          <p className="text-muted-foreground">No hay cursos registrados.</p>
        )}
      </div>
    </div>
  )
}
