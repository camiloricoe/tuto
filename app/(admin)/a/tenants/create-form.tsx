'use client'

import { useActionState, useState } from 'react'
import { createTenantAction } from '@/app/actions/tenants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CreateTenantForm() {
  const [state, action, pending] = useActionState(createTenantAction, null)
  const [open, setOpen] = useState(false)

  if (!open && !state?.success) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        + Nueva institucion
      </Button>
    )
  }

  if (state?.success) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm">
        Institucion creada exitosamente.
        <Button variant="link" onClick={() => window.location.reload()} className="px-2">
          Recargar
        </Button>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-4 rounded-lg border bg-card p-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" required placeholder="Instituto ABC" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          name="slug"
          required
          placeholder="instituto-abc"
          pattern="[a-z0-9-]+"
        />
        <p className="text-xs text-muted-foreground">
          Solo letras minusculas, numeros y guiones
        </p>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creando...' : 'Crear institucion'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
