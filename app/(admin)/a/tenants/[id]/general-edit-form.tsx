'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

import { updateTenantAction } from '@/app/actions/tenants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type GeneralEditFormProps = {
  initial: {
    tenantId: string
    name: string
    subdomain: string
    active: boolean
  }
}

export function GeneralEditForm({ initial }: GeneralEditFormProps) {
  const [state, action, pending] = useActionState(updateTenantAction, null)
  const [name, setName] = useState(initial.name)
  const [subdomain, setSubdomain] = useState(initial.subdomain)
  const [active, setActive] = useState(initial.active)

  useEffect(() => {
    if (!state) return
    if ('success' in state && state.success) {
      toast.success('Tenant actualizado')
    } else if ('error' in state && state.error) {
      toast.error(state.error)
    }
  }, [state])

  const dirty =
    name !== initial.name ||
    subdomain !== initial.subdomain ||
    active !== initial.active

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="tenantId" value={initial.tenantId} />

      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Instituto ABC"
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          Nombre publico del tenant. Maximo 120 caracteres.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subdomain">Subdominio</Label>
        <Input
          id="subdomain"
          name="subdomain"
          required
          maxLength={63}
          pattern="[a-z0-9]([a-z0-9-]*[a-z0-9])?"
          value={subdomain}
          onChange={(e) =>
            setSubdomain(e.target.value.toLowerCase().replace(/\s+/g, ''))
          }
          placeholder="instituto-abc"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <p className="text-xs text-muted-foreground">
          Solo letras minusculas, numeros y guiones (no al inicio o final).
        </p>
        <p className="text-xs text-muted-foreground">
          URL:{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
            {subdomain || 'tu-subdominio'}.creadigitalagency.com
          </code>
        </p>
      </div>

      <div className="rounded-md border bg-card/50 p-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="active"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
          />
          <span className="space-y-0.5">
            <span className="block text-sm font-medium leading-none">
              Tenant activo
            </span>
            <span className="block text-xs text-muted-foreground">
              Los usuarios pueden iniciar sesion. Si esta inactivo, se bloquea
              el acceso a todos los usuarios.
            </span>
          </span>
        </label>
      </div>

      {state && 'error' in state && state.error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !dirty}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Guardar cambios
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
