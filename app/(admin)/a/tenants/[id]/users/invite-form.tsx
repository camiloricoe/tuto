'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Loader2, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { inviteTenantAdminAction } from '@/app/actions/tenant-users'

type InviteFormProps = {
  tenantId: string
}

const ROLE_OPTIONS = [
  { code: 'admin', label: 'Admin' },
  { code: 'coordinator', label: 'Coordinador' },
  { code: 'treasurer', label: 'Tesorero' },
  { code: 'teacher', label: 'Docente' },
  { code: 'student', label: 'Estudiante' },
] as const

export function InviteForm({ tenantId }: InviteFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action, pending] = useActionState(inviteTenantAdminAction, null)

  useEffect(() => {
    if (!state) return
    if ('success' in state && state.success) {
      toast.success(state.message ?? 'Usuario invitado')
      formRef.current?.reset()
    } else if ('error' in state && state.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base">Invitar usuario</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={action} className="space-y-4">
          <input type="hidden" name="tenantId" value={tenantId} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                required
                placeholder="usuario@institucion.edu.co"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Rol</Label>
              <select
                id="invite-role"
                name="roleCode"
                required
                defaultValue="student"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-fullName">
              Nombre completo{' '}
              <span className="text-xs text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="invite-fullName"
              name="fullName"
              type="text"
              placeholder="Maria Perez"
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground">
              Solo se usa si el usuario es nuevo. Para usuarios existentes, solo se
              asigna el rol.
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Invitando...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Invitar
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
