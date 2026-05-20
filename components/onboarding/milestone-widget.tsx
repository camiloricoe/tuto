import { ChevronRight, Sparkles } from 'lucide-react'
import type { RoleProgress } from '@/lib/onboarding/types'
import { cn } from '@/lib/utils'

export function MilestoneWidget({
  progress,
  welcomePath,
  className,
}: {
  progress: RoleProgress
  welcomePath: '/a/welcome' | '/t/welcome' | '/s/welcome'
  className?: string
}) {
  const allDone = progress.pending === 0 && progress.completed > 0

  if (allDone) {
    return (
      <a
        href={welcomePath}
        data-testid="milestone-widget"
        data-state="complete"
        className={cn(
          'group mx-2 mt-4 mb-3 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-500/10',
          className,
        )}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1">Todo listo</span>
        <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
      </a>
    )
  }

  return (
    <a
      href={welcomePath}
      data-testid="milestone-widget"
      data-state="active"
      data-percent={progress.percent}
      className={cn(
        'group mx-2 mt-4 mb-3 block rounded-lg border bg-card/50 p-3 transition-colors hover:bg-muted',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-foreground">Primeros pasos</span>
        <span className="text-muted-foreground">
          {progress.completed}/{progress.total - progress.dismissed}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          data-testid="milestone-widget-bar"
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{progress.percent}% completo</span>
        <span className="flex items-center gap-1 group-hover:text-foreground">
          Ver guia <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </a>
  )
}
