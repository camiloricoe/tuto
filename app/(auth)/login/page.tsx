'use client'

import { useActionState } from 'react'
import { loginAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null)

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <Card className="glass w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-semibold tracking-tight">TUTO</CardTitle>
          <p className="text-sm text-muted-foreground">Iniciar sesion</p>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
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
              <a href="/forgot-password" className="text-sm text-muted-foreground hover:text-primary">
                Olvidaste tu password?
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
