import Link from 'next/link'
import type { Route } from 'next'
import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PeriodForm } from './period-form'
import { GradingSchemeForm } from './grading-scheme-form'
import { SubjectForm } from './subject-form'
import { PeriodRowActions, SchemeRowActions, SubjectRowActions } from './row-actions'

export default async function SettingsPage() {
  const session = await requireSession()
  await requirePermission('academic:write')

  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }

  const admin = createAdminClient()
  const tenantId = session.activeTenantId

  const [periodsRes, schemesRes, subjectsRes, programsRes] = await Promise.all([
    admin
      .from('academic_periods')
      .select('id, name, code, kind, starts_on, ends_on, active')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('starts_on', { ascending: false }),
    admin
      .from('grading_schemes')
      .select('id, name, scale_min, scale_max, passing_grade, uses_letters')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name'),
    admin
      .from('subjects')
      .select('id, name, code, credits, academic_programs(name)')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name'),
    admin
      .from('academic_programs')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name'),
  ])

  const periods = periodsRes.data ?? []
  const schemes = schemesRes.data ?? []
  const subjects = subjectsRes.data ?? []
  const programs = programsRes.data ?? []
  const canWrite = session.permissions.has('academic:write')

  const KIND_LABELS: Record<string, string> = {
    bimester: 'Bimestre',
    trimester: 'Trimestre',
    quadrimester: 'Cuatrimestre',
    semester: 'Semestre',
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Configuracion</h1>

      {/* Branding */}
      <section className="grid gap-4 md:grid-cols-2">
        <Link href="/a/settings/branding" className="block">
          <Card className="glass transition-colors hover:bg-accent/30">
            <CardHeader>
              <CardTitle className="text-base">Branding y marca</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Personaliza el logo, favicon, colores y mensajes de la institución.
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href={'/a/settings/terminology' as Route} className="block">
          <Card className="glass transition-colors hover:bg-accent/30">
            <CardHeader>
              <CardTitle className="text-base">Terminología</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Renombra los conceptos académicos (Programa, Curso, Pensum...) según el vocabulario
                de tu institución.
              </p>
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* Academic Periods */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Periodos academicos</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            {periods.map((period) => (
              <Card key={period.id} className="glass-subtle">
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="font-medium">{period.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {KIND_LABELS[period.kind] ?? period.kind} · {period.code}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {period.starts_on} — {period.ends_on}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {period.active && (
                      <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-600">
                        Activo
                      </span>
                    )}
                    <PeriodRowActions id={period.id} canWrite={canWrite} />
                  </div>
                </CardContent>
              </Card>
            ))}
            {periods.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay periodos creados.</p>
            )}
          </div>
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-base">Nuevo periodo</CardTitle>
            </CardHeader>
            <CardContent>
              <PeriodForm />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Grading Schemes */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Esquemas de calificacion</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            {schemes.map((scheme) => (
              <Card key={scheme.id} className="glass-subtle">
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="font-medium">{scheme.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Escala: {scheme.scale_min} — {scheme.scale_max} · Aprobacion:{' '}
                      {scheme.passing_grade}
                      {scheme.uses_letters && ' · Usa letras'}
                    </p>
                  </div>
                  <SchemeRowActions id={scheme.id} canWrite={canWrite} />
                </CardContent>
              </Card>
            ))}
            {schemes.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay esquemas creados.</p>
            )}
          </div>
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-base">Nuevo esquema</CardTitle>
            </CardHeader>
            <CardContent>
              <GradingSchemeForm />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Subjects */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Materias</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            {subjects.map((subject) => {
              const program = subject.academic_programs as unknown as { name: string } | null
              return (
                <Card key={subject.id} className="glass-subtle">
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <p className="font-medium">{subject.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {subject.code}
                        {subject.credits ? ` · ${subject.credits} creditos` : ''}
                        {program ? ` · ${program.name}` : ''}
                      </p>
                    </div>
                    <SubjectRowActions id={subject.id} canWrite={canWrite} />
                  </CardContent>
                </Card>
              )
            })}
            {subjects.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay materias creadas.</p>
            )}
          </div>
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-base">Nueva materia</CardTitle>
            </CardHeader>
            <CardContent>
              <SubjectForm programs={programs} />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
