import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Camera } from 'lucide-react'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import {
  getGroupById,
  getGroupSubjects,
  getGroupMembers,
  getPublishedCurriculumsForProgram,
  getStudentsAvailableForGroup,
} from '@/lib/db/groups'
import { getTenantTerms } from '@/lib/terminology/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArchiveGroupButton } from './archive-button'
import { SnapshotDialog } from './snapshot-dialog'
import { GroupMembersSection } from './members-section'

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  graduated: 'Graduado',
  archived: 'Archivado',
}

const STATUS_CLASSES: Record<string, string> = {
  active: 'bg-primary/10 text-primary',
  graduated: 'bg-secondary text-secondary-foreground',
  archived: 'bg-muted text-muted-foreground',
}

const SUBJECT_STATUS_LABELS: Record<string, string> = {
  planned: 'Planificada',
  in_progress: 'En curso',
  completed: 'Completada',
  skipped: 'Omitida',
}

const SUBJECT_STATUS_CLASSES: Record<string, string> = {
  planned: 'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/10 text-primary',
  completed: 'bg-secondary text-secondary-foreground',
  skipped: 'bg-muted text-muted-foreground',
}

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireSession()
  await requirePermission('groups:read')

  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }

  const { id } = await params
  const group = await getGroupById(session.activeTenantId, id)
  if (!group) notFound()

  const program = group.academic_programs as unknown as
    | { id: string; name: string; code: string }
    | null
  const curriculum = group.curriculums as unknown as
    | { id: string; name: string; version: string; status: string }
    | null

  const canWrite = session.permissions.has('groups:write')
  const [subjects, members, terms] = await Promise.all([
    getGroupSubjects(session.activeTenantId, group.id),
    getGroupMembers(session.activeTenantId, group.id),
    getTenantTerms(session.activeTenantId),
  ])

  const needsSnapshot = !group.snapshotted_at && group.status === 'active'
  const publishedCurriculums = needsSnapshot && program
    ? await getPublishedCurriculumsForProgram(session.activeTenantId, program.id)
    : []
  const availableStudents = canWrite
    ? await getStudentsAvailableForGroup(session.activeTenantId, group.id)
    : []

  const statusLabel = STATUS_LABELS[group.status] ?? group.status
  const statusClass = STATUS_CLASSES[group.status] ?? 'bg-muted text-muted-foreground'

  const cyclesMap = new Map<number, typeof subjects>()
  for (const s of subjects) {
    const list = cyclesMap.get(s.cycle) ?? []
    list.push(s)
    cyclesMap.set(s.cycle, list)
  }
  const sortedCycles = Array.from(cyclesMap.keys()).sort((a, b) => a - b)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href="/a/academic/groups" className="hover:underline">
              Grupos
            </Link>
          </p>
          <h1 className="text-2xl font-semibold">{group.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {needsSnapshot && canWrite && (
            <SnapshotDialog
              groupId={group.id}
              publishedCurriculums={publishedCurriculums}
            />
          )}
          {canWrite && group.status === 'active' && (
            <ArchiveGroupButton groupId={group.id} />
          )}
        </div>
      </div>

      <Card className="glass-subtle">
        <CardContent className="space-y-3 py-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass}`}>
              {statusLabel}
            </span>
            <span className="text-muted-foreground">
              Programa: {program?.name ?? 'Sin programa'}
            </span>
            <span className="text-muted-foreground">
              Ingreso: {group.intake_year}
              {group.intake_period ? `-${group.intake_period}` : ''}
            </span>
            <span className="text-muted-foreground">Ciclo actual: {group.current_cycle}</span>
            {group.code && (
              <span className="text-muted-foreground">Codigo: {group.code}</span>
            )}
          </div>
          {curriculum && (
            <p className="inline-flex items-center gap-2 text-sm">
              <Camera className="h-4 w-4 text-primary" />
              {terms.curriculum.singular}:{' '}
              <span className="font-medium">
                {curriculum.name} (v{curriculum.version})
              </span>
            </p>
          )}
          {group.notes && (
            <p className="text-sm text-muted-foreground">{group.notes}</p>
          )}
        </CardContent>
      </Card>

      <Card className="glass-subtle">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Plan academico</CardTitle>
          {subjects.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {subjects.length} materia{subjects.length === 1 ? '' : 's'}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {group.snapshotted_at
                ? 'El plan no tiene materias registradas.'
                : needsSnapshot
                  ? `Aun no se ha aplicado un ${terms.curriculum.singular.toLowerCase()}. Usa el boton "Aplicar ${terms.curriculum.singular.toLowerCase()}" para copiar uno.`
                  : 'Sin plan academico.'}
            </p>
          ) : (
            <div className="space-y-4">
              {sortedCycles.map((cycle) => {
                const cycleSubjects = cyclesMap.get(cycle) ?? []
                return (
                  <div key={cycle} className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Ciclo {cycle}
                    </p>
                    <div className="space-y-1">
                      {cycleSubjects.map((gs) => {
                        const subject = gs.subjects as unknown as
                          | { name: string; code: string }
                          | null
                        const subjectStatus =
                          SUBJECT_STATUS_LABELS[gs.status] ?? gs.status
                        const subjectStatusClass =
                          SUBJECT_STATUS_CLASSES[gs.status] ??
                          'bg-muted text-muted-foreground'
                        return (
                          <div
                            key={gs.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-3 py-2 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="font-medium">
                                {subject?.code ?? ''} {subject?.name ?? 'Materia'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {gs.credits != null ? `${gs.credits} creditos` : 'Sin creditos'}
                                {gs.is_required ? ' · Obligatoria' : ' · Electiva'}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${subjectStatusClass}`}
                            >
                              {subjectStatus}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-subtle">
        <CardHeader>
          <CardTitle className="text-base">Miembros</CardTitle>
        </CardHeader>
        <CardContent>
          <GroupMembersSection
            groupId={group.id}
            members={members.map((m) => ({
              id: m.id,
              studentId: m.student_id,
              fullName: m.user_profile?.full_name ?? 'Estudiante',
              documentType: m.user_profile?.document_type ?? null,
              documentNumber: m.user_profile?.document_number ?? null,
              joinedAt: m.joined_at,
            }))}
            availableStudents={availableStudents.map((s) => ({
              id: s.id,
              fullName: s.full_name,
              documentNumber: s.document_number,
            }))}
            canManage={canWrite}
          />
        </CardContent>
      </Card>
    </div>
  )
}
