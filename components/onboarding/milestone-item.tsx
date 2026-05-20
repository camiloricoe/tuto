'use client'

import { useTransition, useState } from 'react'
import { Check, ChevronRight, EyeOff, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MilestoneIcon } from './milestone-icon'
import {
  dismissMilestoneAction,
  restoreMilestoneAction,
} from '@/app/actions/onboarding'
import type { MilestoneStatus } from '@/lib/onboarding/types'
import { cn } from '@/lib/utils'

export function MilestoneItem({ item }: { item: MilestoneStatus }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const { milestone, completed, dismissed } = item

  function handleDismiss() {
    setError(null)
    startTransition(async () => {
      const res = await dismissMilestoneAction(milestone.code)
      if ('error' in res) setError(res.error)
    })
  }

  function handleRestore() {
    setError(null)
    startTransition(async () => {
      const res = await restoreMilestoneAction(milestone.code)
      if ('error' in res) setError(res.error)
    })
  }

  return (
    <div
      data-testid={`milestone-item-${milestone.code}`}
      data-completed={completed}
      data-dismissed={dismissed}
      className={cn(
        'group flex items-start gap-3 rounded-lg border p-4 transition-colors',
        completed && 'border-emerald-500/30 bg-emerald-500/5',
        !completed && dismissed && 'border-border bg-muted/30 opacity-60',
        !completed && !dismissed && 'border-border bg-card hover:border-primary/40 hover:bg-muted/40',
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
          completed
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'border-muted-foreground/20 bg-background text-muted-foreground',
        )}
      >
        {completed ? (
          <Check className="h-4 w-4" />
        ) : (
          <MilestoneIcon name={milestone.icon} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className={cn(
              'text-sm font-medium',
              completed && 'text-foreground/80',
            )}
          >
            {milestone.title}
          </h3>
          {completed && (
            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
              Hecho
            </span>
          )}
          {!completed && dismissed && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Oculto
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {milestone.description}
        </p>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {!completed && !dismissed && (
          <>
            <Button
              asChild
              size="sm"
              variant="outline"
              data-testid={`milestone-go-${milestone.code}`}
            >
              <a href={milestone.href}>
                Ir <ChevronRight className="ml-1 h-3 w-3" />
              </a>
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Ocultar este paso"
              title="Ocultar"
              disabled={isPending}
              onClick={handleDismiss}
              data-testid={`milestone-dismiss-${milestone.code}`}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
            </Button>
          </>
        )}
        {!completed && dismissed && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={handleRestore}
            data-testid={`milestone-restore-${milestone.code}`}
          >
            {isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <RotateCcw className="mr-1 h-3 w-3" />
            )}
            Restaurar
          </Button>
        )}
      </div>
    </div>
  )
}
