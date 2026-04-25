'use client'

import { useActionState } from 'react'
import { resetPasswordAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(resetPasswordAction, null)

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <Card className="glass w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-semibold">Nuevo password</CardTitle>
          <p className="text-sm text-muted-foreground">Minimo 10 caracteres con letras y numeros</p>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nuevo password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
              />
            </div>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Cambiando...' : 'Cambiar password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
