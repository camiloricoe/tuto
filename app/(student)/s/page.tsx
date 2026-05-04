import { requireSession } from '@/lib/auth/session'
import { getStudentEnrollments } from '@/lib/db/academic'
import { getStudentAccountStatement } from '@/lib/db/payments'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Star, Wallet, ArrowRight } from 'lucide-react'

export default async function StudentDashboard() {
  const session = await requireSession()
  const tenantId = session.activeTenantId
  const studentId = session.userId

  const [enrollments, statement] = await Promise.all([
    getStudentEnrollments(tenantId ?? '', studentId),
    getStudentAccountStatement(tenantId ?? '', studentId),
  ])

  const activeEnrollments = enrollments.filter((e) => e.status === 'active')

  const gradesWithValue = enrollments
    .map((e) => e.final_grade)
    .filter((g): g is number => g !== null && g !== undefined)

  const avgGrade =
    gradesWithValue.length > 0
      ? gradesWithValue.reduce((sum, g) => sum + g, 0) / gradesWithValue.length
      : null

  const balanceDue = statement?.balance_due ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bienvenido, {session.profile.fullName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Resumen de tu actividad academica</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass-subtle">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cursos inscritos
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeEnrollments.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {enrollments.length} total
            </p>
            <Button variant="link" className="mt-2 h-auto p-0 text-xs" asChild>
              <a href="/s/courses">
                Ver cursos <ArrowRight className="ml-1 h-3 w-3" />
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-subtle">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Nota promedio
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {avgGrade !== null ? avgGrade.toFixed(1) : '—'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {gradesWithValue.length > 0
                ? `Basado en ${gradesWithValue.length} calificacion${gradesWithValue.length === 1 ? '' : 'es'}`
                : 'Sin calificaciones aun'}
            </p>
            <Button variant="link" className="mt-2 h-auto p-0 text-xs" asChild>
              <a href="/s/grades">
                Ver calificaciones <ArrowRight className="ml-1 h-3 w-3" />
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-subtle">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo pendiente
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${balanceDue > 0 ? 'text-destructive' : ''}`}>
              {new Intl.NumberFormat('es', { style: 'currency', currency: 'USD' }).format(
                balanceDue,
              )}
            </p>
            {statement?.overdue_count && statement.overdue_count > 0 ? (
              <p className="mt-1 text-xs text-destructive">
                {statement.overdue_count} cargo{statement.overdue_count === 1 ? '' : 's'} vencido{statement.overdue_count === 1 ? '' : 's'}
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Al corriente</p>
            )}
            <Button variant="link" className="mt-2 h-auto p-0 text-xs" asChild>
              <a href="/s/payments">
                Ver pagos <ArrowRight className="ml-1 h-3 w-3" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {activeEnrollments.length > 0 && (
        <Card className="glass-subtle">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Mis cursos activos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {activeEnrollments.map((enrollment) => {
                const course = Array.isArray(enrollment.courses)
                  ? enrollment.courses[0]
                  : enrollment.courses
                const subject = course
                  ? Array.isArray(course.subjects)
                    ? course.subjects[0]
                    : course.subjects
                  : null
                const period = course
                  ? Array.isArray(course.academic_periods)
                    ? course.academic_periods[0]
                    : course.academic_periods
                  : null

                return (
                  <li key={enrollment.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{subject?.name ?? 'Sin materia'}</p>
                      <p className="text-xs text-muted-foreground">
                        {period?.name ?? ''}{course ? ` · ${course.section_code}` : ''}
                        {enrollment.final_grade != null
                          ? ` · Nota: ${enrollment.final_grade}`
                          : ''}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href="/s/grades">
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
