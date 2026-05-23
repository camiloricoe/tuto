'use client'

import { useActionState, useEffect, useState } from 'react'

import { updateUserProfileAction } from '@/app/actions/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DOCUMENT_TYPE_OPTIONS,
  PHONE_TYPE_OPTIONS,
} from '@/lib/constants/user-profile'

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

type EditUserProfileFormProps = {
  userId: string
  defaults: {
    fullName: string
    documentType: string | null
    documentNumber: string | null
    phone: string | null
    phoneType: string | null
  }
}

export function EditUserProfileForm({
  userId,
  defaults,
}: EditUserProfileFormProps) {
  const [state, action, pending] = useActionState(updateUserProfileAction, null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (state?.success) setOpen(false)
  }, [state?.success])

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Editar
      </Button>
    )
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="userId" value={userId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="edit-fullName">Nombre completo</Label>
          <Input
            id="edit-fullName"
            name="fullName"
            required
            defaultValue={defaults.fullName}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-documentType">Tipo de documento</Label>
          <select
            id="edit-documentType"
            name="documentType"
            className={SELECT_CLASS}
            defaultValue={defaults.documentType ?? ''}
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
          <Label htmlFor="edit-documentNumber">Número de documento</Label>
          <Input
            id="edit-documentNumber"
            name="documentNumber"
            defaultValue={defaults.documentNumber ?? ''}
            placeholder="1.234.567.890"
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-phone">Teléfono</Label>
          <Input
            id="edit-phone"
            name="phone"
            type="tel"
            defaultValue={defaults.phone ?? ''}
            placeholder="+57 300 123 4567"
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-phoneType">Tipo de teléfono</Label>
          <select
            id="edit-phoneType"
            name="phoneType"
            className={SELECT_CLASS}
            defaultValue={defaults.phoneType ?? ''}
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

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
