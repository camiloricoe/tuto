import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Route } from 'next'

import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import {
  getUserProfile,
  getUserGroups,
  getUserEnrollments,
} from '@/lib/db/users'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type UserAcademicPageProps = {
  params: Promise<{ id: string }>
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const dateFmt = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' })

const ENROLLMENT_LIMIT = 20

const groupStatusLabel: Record<string, string> = {
  active: 'Activo',
  graduated: 'Graduado',
  archived: 'Archivado',
  inactive: 'Inactivo',
}

export default async function UserAcademicPage({
  params,
}: UserAcademicPageProps) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const session = await requireSession()
  await requirePermission('users:read')
  if (!session.activeTenantId) notFound()

  const profile = await getUserProfile(session.activeTenantId, id)
  if (!profile) notFound()

  const [groups, enrollments] = await Promise.all([
    getUserGroups(session.activeTenantId, id),
    getUserEnrollments(session.activeTenantId, id),
  ])

  const recentEnrollments = enrollments.slice(0, ENROLLMENT_LIMIT)

  return (
    <div className="space-y-6">
      <Card className="glass-subtle">
        <CardHeader>
          <CardTitle className="text-base">Grupos</CardTitle>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este usuario no pertenece a ningún grupo.
            </p>
          ) : (
            <ul className="divide-y">
              {groups.map((g) => {
                const isHistorical = g.left_at !== null
                return (
                  <li
                    key={g.membership_id}
                    className={
                      isHistorical
                        ? 'flex flex-wrap items-center justify-between gap-3 py-3 opacity-60'
                        : 'flex flex-wrap items-center justify-between gap-3 py-3'
                    }
                  >
                    <div className="space-y-1">
                      <Link
                        href={`/a/academic/groups/${g.group_id}` as Route}
                        className="font-medium hover:underline"
                      >
                        {g.group_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {g.program_name ?? 'Programa desconocido'}
                        {g.program_code && ` · ${g.program_code}`}
                        {` · Ingreso ${g.intake_year}`}
                        {` · Ciclo ${g.current_cycle}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ingresó {dateFmt.format(new Date(g.joined_at))}
                        {g.left_at && (
                          <> · Salió {dateFmt.format(new Date(g.left_at))}</>
                        )}
                      </p>
                    </div>
                    <StatusBadge status={g.group_status} />
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="glass-subtle">
        <CardHeader>
          <CardTitle className="text-base">Matrículas recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEnrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este usuario no tiene matrículas.
            </p>
          ) : (
            <ul className="divide-y">
              {recentEnrollments.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="space-y-1">
                    {e.course_id ? (
                      <Link
                        href={`/a/academic/courses/${e.course_id}` as Route}
                        className="font-medium hover:underline"
                      >
                        {e.subject_code ? `${e.subject_code} · ` : ''}
                        {e.subject_name || 'Materia desconocida'}
                      </Link>
                    ) : (
                      <span className="font-medium">
                        {e.subject_name || 'Materia desconocida'}
                      </span>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {e.period_name ?? 'Sin periodo'}
                      {e.period_code && ` · ${e.period_code}`}
                      {' · '}
                      {dateFmt.format(new Date(e.enrolled_at))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {e.final_grade !== null && (
                      <span className="font-mono tabular-nums">
                        {e.final_grade.toFixed(1)}
                        {e.final_letter && ` (${e.final_letter})`}
                      </span>
                    )}
                    <StatusBadge status={e.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const label = groupStatusLabel[status] ?? status
  const tone =
    status === 'active' || status === 'enrolled' || status === 'in_progress'
      ? 'bg-primary/10 text-primary'
      : status === 'graduated' || status === 'completed' || status === 'passed'
        ? 'bg-green-500/10 text-green-700 dark:text-green-300'
        : status === 'failed' || status === 'withdrawn' || status === 'dropped'
          ? 'bg-destructive/10 text-destructive'
          : 'bg-muted text-muted-foreground'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}
    >
      {label}
    </span>
  )
}
