'use client'

import { useActionState } from 'react'
import { inviteUserAction } from '@/app/actions/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'coordinator', label: 'Coordinador' },
  { value: 'treasurer', label: 'Tesorero' },
  { value: 'teacher', label: 'Profesor' },
  { value: 'student', label: 'Estudiante' },
]

export default function InviteUserPage() {
  const [state, action, pending] = useActionState(inviteUserAction, null)

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Invitar usuario</h1>
      <Card className="glass">
        <CardContent className="pt-6">
          {state?.success ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Invitacion enviada a <strong>{state.email}</strong>
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" asChild>
                  <a href="/a/users">Ver usuarios</a>
                </Button>
                <Button asChild>
                  <a href="/a/users/new">Invitar otro</a>
                </Button>
              </div>
            </div>
          ) : (
            <form action={action} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre completo</Label>
                <Input id="fullName" name="fullName" required placeholder="Juan Perez" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="juan@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roleCode">Rol</Label>
                <select
                  id="roleCode"
                  name="roleCode"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar rol...</option>
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? 'Invitando...' : 'Enviar invitacion'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
