'use client'

import { useActionState } from 'react'
import { createTenantAction } from '@/app/actions/tenants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TenantsPage() {
  const [state, action, pending] = useActionState(createTenantAction, null)

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Crear tenant</h1>
      <Card className="glass">
        <CardContent className="pt-6">
          {state?.success ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">Tenant creado exitosamente.</p>
              <Button asChild>
                <a href="/a">Volver al dashboard</a>
              </Button>
            </div>
          ) : (
            <form action={action} className="space-y-4">
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
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? 'Creando...' : 'Crear tenant'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
