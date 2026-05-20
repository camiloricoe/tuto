import { Sparkles } from 'lucide-react'
import type { RoleProgress } from '@/lib/onboarding/types'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Administrador',
  admin: 'Administrador',
  coordinator: 'Coordinador',
  treasurer: 'Tesoreria',
  teacher: 'Profesor',
  student: 'Estudiante',
}

export function MilestoneProgressHeader({ progress }: { progress: RoleProgress }) {
  const activeTotal = progress.total - progress.dismissed
  const allDone = progress.pending === 0 && progress.completed > 0
  const subtitle = allDone
    ? 'Has completado todos los pasos sugeridos. Sigue explorando.'
    : 'Una lista corta de pasos para conocer tu portal. Puedes ocultar los que no apliquen.'

  return (
    <div className="space-y-4" data-testid="milestone-progress-header">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {ROLE_LABELS[progress.role] ?? progress.role}
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
          Primeros pasos
          {allDone && (
            <Sparkles className="h-5 w-5 text-emerald-500" aria-hidden />
          )}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div
        className="rounded-lg border bg-card p-4"
        data-testid="milestone-progress-summary"
        data-percent={progress.percent}
      >
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-3xl font-semibold tabular-nums">
              {progress.completed}
              <span className="ml-1 text-base font-normal text-muted-foreground">
                de {activeTotal}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {progress.pending > 0
                ? `Te quedan ${progress.pending} pendiente${progress.pending === 1 ? '' : 's'}`
                : 'Completado'}
              {progress.dismissed > 0 && ` · ${progress.dismissed} oculto${progress.dismissed === 1 ? '' : 's'}`}
            </p>
          </div>
          <span className="text-2xl font-semibold tabular-nums text-primary">
            {progress.percent}%
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
