'use client'

import { useActionState, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { updateTerminologyAction } from '@/app/actions/tenants/terminology'
import {
  DEFAULT_TERMS,
  TERM_KEYS,
  TERM_LABELS,
  type TenantTerms,
  type TermKey,
} from '@/lib/terminology/defaults'

export function TerminologyForm({ initial }: { initial: TenantTerms }) {
  const [terms, setTerms] = useState<TenantTerms>(initial)
  const [state, action, pending] = useActionState(
    async (prev: { success: true } | { error: string } | null, formData: FormData) => {
      const res = await updateTerminologyAction(prev, formData)
      if ('success' in res && res.success) {
        toast.success('Terminología guardada')
      } else if ('error' in res) {
        toast.error(res.error)
      }
      return res
    },
    null,
  )

  function update(key: TermKey, field: 'singular' | 'plural', value: string) {
    setTerms((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }

  function reset() {
    setTerms(DEFAULT_TERMS)
    toast.message('Valores por defecto restaurados. No olvides guardar.')
  }

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {TERM_KEYS.map((key) => {
          const pair = terms[key]
          return (
            <Card key={key} className="glass">
              <CardHeader>
                <CardTitle className="text-base">{TERM_LABELS[key]}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${key}-singular`}>Singular</Label>
                  <Input
                    id={`${key}-singular`}
                    name={`${key}.singular`}
                    value={pair.singular}
                    maxLength={60}
                    required
                    onChange={(e) => update(key, 'singular', e.target.value)}
                    placeholder={DEFAULT_TERMS[key].singular}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${key}-plural`}>Plural</Label>
                  <Input
                    id={`${key}-plural`}
                    name={`${key}.plural`}
                    value={pair.plural}
                    maxLength={60}
                    required
                    onChange={(e) => update(key, 'plural', e.target.value)}
                    placeholder={DEFAULT_TERMS[key].plural}
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {state && 'error' in state && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={reset} disabled={pending}>
          Restaurar valores por defecto
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando...' : 'Guardar terminología'}
        </Button>
      </div>
    </form>
  )
}
