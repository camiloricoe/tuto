'use client'

import { useActionState } from 'react'
import { forgotPasswordAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPasswordAction, null)

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <Card className="glass w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-semibold">Recuperar password</CardTitle>
          <p className="text-sm text-muted-foreground">Te enviaremos un link para restablecer</p>
        </CardHeader>
        <CardContent>
          {state?.success ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Si el email existe, recibiras un link para restablecer tu password.
              </p>
              <a href="/login" className="text-sm text-primary hover:underline">
                Volver al login
              </a>
            </div>
          ) : (
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
              {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? 'Enviando...' : 'Enviar link'}
              </Button>
              <div className="text-center">
                <a href="/login" className="text-sm text-muted-foreground hover:text-primary">
                  Volver al login
                </a>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
