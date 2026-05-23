import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Route } from 'next'

import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { getProgramById } from '@/lib/db/academic'
import { getTenantTerms } from '@/lib/terminology/server'

type ProgramCockpitLayoutProps = {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MODALITY_LABELS: Record<string, string> = {
  presential: 'Presencial',
  virtual: 'Virtual',
  hybrid: 'Hibrido',
}

export default async function ProgramCockpitLayout({
  children,
  params,
}: ProgramCockpitLayoutProps) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const session = await requireSession()
  await requirePermission('academic:read')

  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }

  const [program, terms] = await Promise.all([
    getProgramById(session.activeTenantId, id).catch(() => null),
    getTenantTerms(session.activeTenantId),
  ])
  if (!program) notFound()

  const tabs = [
    { href: `/a/academic/programs/${id}` as Route, label: 'General' },
    { href: `/a/academic/programs/${id}/curriculums` as Route, label: terms.curriculum.plural },
    { href: `/a/academic/programs/${id}/groups` as Route, label: terms.group.plural },
    { href: `/a/academic/programs/${id}/courses` as Route, label: terms.course.plural },
  ] as const

  const modalityLabel = MODALITY_LABELS[program.modality] ?? program.modality

  return (
    <div className="space-y-6">
      <header className="space-y-2 border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/a/academic/programs"
              className="text-xs text-muted-foreground hover:underline"
            >
              ← Todos los {terms.program.plural.toLowerCase()}
            </Link>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {program.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {program.code}
              </code>
              <span className="ml-2">{modalityLabel}</span>
            </p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto" aria-label="Secciones del programa">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="rounded-md border border-transparent px-3 py-1.5 text-sm text-muted-foreground transition hover:border-border hover:bg-muted hover:text-foreground"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>

      <div>{children}</div>
    </div>
  )
}
