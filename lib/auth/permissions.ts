import { requireSession } from './session'
import { ForbiddenError } from './errors'

export async function can(permission: string): Promise<boolean> {
  const session = await requireSession()
  return session.permissions.has(permission)
}

export async function requirePermission(permission: string): Promise<void> {
  const hasPermission = await can(permission)
  if (!hasPermission) throw new ForbiddenError(`Permiso requerido: ${permission}`)
}
