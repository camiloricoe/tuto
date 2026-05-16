'use client'

import { useActionState } from 'react'
import { loginAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  tenantId: string | null
  tenantName: string | null
}

export function LoginForm({ tenantId, tenantName }: Props) {
  const [state, action, pending] = useActionState(loginAction, null)

  return (
    <form action={action} className="space-y-4">
      {tenantId && (
        <>
          <input type="hidden" name="tenantId" value={tenantId} />
          {tenantName && <input type="hidden" name="tenantName" value={tenantName} />}
        </>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@email.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Ingresando...' : 'Ingresar'}
      </Button>
      <div className="text-center">
        <a
          href="/forgot-password"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          Olvidaste tu password?
        </a>
      </div>
    </form>
  )
}
