import { requireSession } from '@/lib/auth/session'
import { getCourseById, getCourseGrades } from '@/lib/db/academic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import GradesMatrix from './matrix'

type Props = { params: Promise<{ id: string }> }

export default async function GradesPage({ params }: Props) {
  const { id } = await params
  const session = await requireSession()

  const [course, gradesData] = await Promise.all([
    getCourseById(session.activeTenantId ?? '', id),
    getCourseGrades(session.activeTenantId ?? '', id),
  ])

  const subject = course.subjects as unknown as { name: string } | null
  const evaluations = (course.course_evaluations as unknown as Array<{
    id: string
    name: string
    code: string
    weight: number
    sequence: number
  }> ?? []).sort((a, b) => a.sequence - b.sequence)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Notas — {subject?.name ?? 'Curso'}</h1>
        <p className="text-sm text-muted-foreground">
          Estado: <span className="capitalize">{course.status}</span>
        </p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">Matriz de notas</CardTitle>
        </CardHeader>
        <CardContent>
          <GradesMatrix courseId={id} evaluations={evaluations} enrollments={gradesData} />
        </CardContent>
      </Card>
    </div>
  )
}
