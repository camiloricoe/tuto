'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createCurriculumAction } from '@/app/actions/academic/curriculums'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTerms } from '@/components/terminology/terms-provider'

type ProgramOption = { id: string; name: string; code: string }

type ActionState =
  | { error: string; success?: undefined; id?: undefined }
  | { success: boolean; id?: string; error?: undefined }
  | null

export default function NewCurriculumForm({ programs }: { programs: ProgramOption[] }) {
  const terms = useTerms()
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createCurriculumAction,
    null,
  )
  const router = useRouter()

  useEffect(() => {
    if (state && 'success' in state && state.success && state.id) {
      router.push(`/a/academic/curriculums/${state.id}`)
    }
  }, [state, router])

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Nuevo {terms.curriculum.singular}</h1>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">Datos del {terms.curriculum.singular.toLowerCase()}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="programId">Programa</Label>
              <select
                id="programId"
                name="programId"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Seleccionar...</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
              {programs.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Crea primero un programa academico.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                name="name"
                placeholder={`Ej: ${terms.curriculum.singular} 2026-1`}
                required
                minLength={2}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="version">Version</Label>
              <Input id="version" name="version" placeholder="1" defaultValue="1" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="cycles">Ciclos</Label>
              <Input
                id="cycles"
                name="cycles"
                type="number"
                min={1}
                max={20}
                defaultValue={8}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Input id="notes" name="notes" placeholder={`Notas internas del ${terms.curriculum.singular.toLowerCase()}`} />
            </div>

            {state && 'error' in state && state.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            {state && 'success' in state && state.success && (
              <p className="text-sm text-primary">{terms.curriculum.singular} creado. Redirigiendo...</p>
            )}

            <Button
              type="submit"
              disabled={pending || programs.length === 0}
              className="w-full"
            >
              {pending ? 'Creando...' : `Crear ${terms.curriculum.singular.toLowerCase()}`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
