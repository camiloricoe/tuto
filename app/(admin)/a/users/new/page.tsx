'use client'

import { useActionState } from 'react'
import { inviteUserAction } from '@/app/actions/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  DOCUMENT_TYPE_OPTIONS,
  PHONE_TYPE_OPTIONS,
} from '@/lib/constants/user-profile'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'coordinator', label: 'Coordinador' },
  { value: 'treasurer', label: 'Tesorero' },
  { value: 'teacher', label: 'Profesor' },
  { value: 'student', label: 'Estudiante' },
]

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

export default function InviteUserPage() {
  const [state, action, pending] = useActionState(inviteUserAction, null)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Invitar usuario</h1>
      <Card className="glass">
        <CardContent className="pt-6">
          {state?.success ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Invitación enviada a <strong>{state.email}</strong>
              </p>
              <div className="flex justify-center gap-2">
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="fullName">Nombre completo</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    required
                    placeholder="Juan Pérez"
                  />
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
                    className={SELECT_CLASS}
                  >
                    <option value="">Seleccionar rol...</option>
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="documentType">Tipo de documento</Label>
                  <select
                    id="documentType"
                    name="documentType"
                    className={SELECT_CLASS}
                    defaultValue=""
                  >
                    <option value="">Sin especificar</option>
                    {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="documentNumber">Número de documento</Label>
                  <Input
                    id="documentNumber"
                    name="documentNumber"
                    placeholder="1.234.567.890"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+57 300 123 4567"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneType">Tipo de teléfono</Label>
                  <select
                    id="phoneType"
                    name="phoneType"
                    className={SELECT_CLASS}
                    defaultValue=""
                  >
                    <option value="">Sin especificar</option>
                    {PHONE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {state?.error && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}

              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? 'Invitando...' : 'Enviar invitación'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
