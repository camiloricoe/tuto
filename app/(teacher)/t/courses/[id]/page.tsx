import { requireSession } from '@/lib/auth/session'
import { getCourseById, getCourseRoster } from '@/lib/db/academic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Props = { params: Promise<{ id: string }> }

export default async function CourseDetailPage({ params }: Props) {
  const { id } = await params
  const session = await requireSession()

  const [course, roster] = await Promise.all([
    getCourseById(session.activeTenantId ?? '', id),
    getCourseRoster(session.activeTenantId ?? '', id),
  ])

  const subject = course.subjects as unknown as { name: string; code: string } | null
  const period = course.academic_periods as unknown as { name: string; code: string } | null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{subject?.name ?? 'Curso'}</h1>
          <p className="text-muted-foreground">
            {subject?.code} · {period?.name}
            {course.section_code ? ` · Sec. ${course.section_code}` : ''}
          </p>
        </div>
        <Button asChild>
          <a href={`/t/courses/${id}/grades`}>Gestionar notas</a>
        </Button>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">Lista de estudiantes ({roster.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {roster.map((enrollment) => {
              const student = enrollment.user_profiles as unknown as { full_name: string } | null
              return (
                <div key={enrollment.id} className="flex items-center justify-between py-3">
                  <p className="text-sm font-medium">{student?.full_name ?? 'Sin nombre'}</p>
                  <div className="text-right text-xs text-muted-foreground">
                    {enrollment.final_grade != null ? (
                      <span>
                        {enrollment.final_grade.toFixed(1)}
                        {enrollment.final_letter ? ` (${enrollment.final_letter})` : ''}
                      </span>
                    ) : (
                      <span className="capitalize">{enrollment.status}</span>
                    )}
                  </div>
                </div>
              )
            })}
            {roster.length === 0 && (
              <p className="py-3 text-sm text-muted-foreground">No hay estudiantes inscritos.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
