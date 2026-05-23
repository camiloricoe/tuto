'use client'

import { useActionState, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTerms } from '@/components/terminology/terms-provider'
import {
  addCurriculumSubjectAction,
  removeCurriculumSubjectAction,
} from '@/app/actions/academic/curriculums'

type SubjectInfo = {
  id: string
  name: string
  code: string
  credits: number | null
}

type CurriculumSubjectItem = {
  id: string
  cycle: number
  credits: number | null
  isRequired: boolean
  sequence: number
  subject: SubjectInfo | null
}

type Props = {
  curriculum: { id: string; cycles: number; status: string }
  subjects: CurriculumSubjectItem[]
  availableSubjects: SubjectInfo[]
  canEdit: boolean
  programHasSubjects: boolean
}

type ActionState =
  | { error: string; success?: undefined; id?: undefined }
  | { success: boolean; id?: string; error?: undefined }
  | null

export function SubjectsEditor({
  curriculum,
  subjects,
  availableSubjects,
  canEdit,
  programHasSubjects,
}: Props) {
  const terms = useTerms()
  const cycles = useMemo(
    () => Array.from({ length: curriculum.cycles }, (_, i) => i + 1),
    [curriculum.cycles],
  )
  const byCycle = useMemo(() => {
    const m = new Map<number, CurriculumSubjectItem[]>()
    for (const s of subjects) {
      if (!m.has(s.cycle)) m.set(s.cycle, [])
      m.get(s.cycle)!.push(s)
    }
    for (const list of m.values()) {
      list.sort((a, b) => a.sequence - b.sequence)
    }
    return m
  }, [subjects])

  const addEmptyState =
    canEdit && availableSubjects.length === 0 ? (
      !programHasSubjects ? (
        <Card className="glass-subtle">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-sm text-muted-foreground">
              Este {terms.program.singular.toLowerCase()} aún no tiene{' '}
              {terms.subject.plural.toLowerCase()}. Créalas primero para poder agregarlas al{' '}
              {terms.curriculum.singular.toLowerCase()}.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/a/settings">
                Crear {terms.subject.plural.toLowerCase()}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          Ya agregaste todas las {terms.subject.plural.toLowerCase()} del{' '}
          {terms.program.singular.toLowerCase()}.
        </p>
      )
    ) : null

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        {terms.subject.plural} por {terms.cycle.singular.toLowerCase()}
      </h2>
      {addEmptyState}
      <div className="grid gap-3">
        {cycles.map((cycle) => (
          <Card key={cycle} className="glass-subtle">
            <CardHeader>
              <CardTitle className="text-base">
                {terms.cycle.singular} {cycle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CycleSubjectList
                items={byCycle.get(cycle) ?? []}
                canEdit={canEdit}
                curriculumId={curriculum.id}
              />
              {canEdit && availableSubjects.length > 0 && (
                <AddSubjectForm
                  curriculumId={curriculum.id}
                  cycle={cycle}
                  availableSubjects={availableSubjects}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function CycleSubjectList({
  items,
  canEdit,
  curriculumId,
}: {
  items: CurriculumSubjectItem[]
  canEdit: boolean
  curriculumId: string
}) {
  const terms = useTerms()
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleRemove(id: string) {
    if (!confirm(`¿Eliminar esta ${terms.subject.singular.toLowerCase()} del ${terms.curriculum.singular.toLowerCase()}?`)) return
    setError(null)
    setPendingId(id)
    startTransition(async () => {
      const res = await removeCurriculumSubjectAction(id)
      setPendingId(null)
      if (res && 'error' in res && res.error) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sin {terms.subject.plural.toLowerCase()} en este {terms.cycle.singular.toLowerCase()}.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const effectiveCredits = item.credits ?? item.subject?.credits ?? null
        return (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {item.subject?.code ? `${item.subject.code} · ` : ''}
                {item.subject?.name ?? `${terms.subject.singular} eliminada`}
              </p>
              <p className="text-xs text-muted-foreground">
                {effectiveCredits !== null ? `${effectiveCredits} creditos` : 'Sin creditos'}
                {' · '}
                {item.isRequired ? 'Obligatoria' : 'Electiva'}
              </p>
            </div>
            {canEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pendingId === item.id}
                onClick={() => handleRemove(item.id)}
                aria-label={`Eliminar ${terms.subject.singular.toLowerCase()}`}
              >
                {pendingId === item.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        )
      })}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <input type="hidden" data-curriculum-id={curriculumId} />
    </div>
  )
}

function AddSubjectForm({
  curriculumId,
  cycle,
  availableSubjects,
}: {
  curriculumId: string
  cycle: number
  availableSubjects: SubjectInfo[]
}) {
  const terms = useTerms()
  const router = useRouter()
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    addCurriculumSubjectAction,
    null,
  )

  useEffect(() => {
    if (state && 'success' in state && state.success) {
      router.refresh()
    }
  }, [state, router])

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-border/60 p-3"
    >
      <input type="hidden" name="curriculumId" value={curriculumId} />
      <input type="hidden" name="cycle" value={cycle} />

      <div className="flex-1 min-w-[180px] space-y-1">
        <Label htmlFor={`subject-${cycle}`} className="text-xs">
          {terms.subject.singular}
        </Label>
        <select
          id={`subject-${cycle}`}
          name="subjectId"
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Seleccionar...</option>
          {availableSubjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} · {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="w-24 space-y-1">
        <Label htmlFor={`credits-${cycle}`} className="text-xs">
          Creditos
        </Label>
        <Input
          id={`credits-${cycle}`}
          name="credits"
          type="number"
          step="0.5"
          min={0.5}
          placeholder="—"
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          name="isRequired"
          value="true"
          defaultChecked
          className="h-4 w-4 rounded border-input"
        />
        Obligatoria
      </label>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Agregando...' : 'Agregar'}
      </Button>

      {state && 'error' in state && state.error && (
        <p className="basis-full text-xs text-destructive">{state.error}</p>
      )}
    </form>
  )
}
