import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { getTenantTerms } from '@/lib/terminology/server'
import { TerminologyForm } from './form'

export const metadata = {
  title: 'Terminología',
}

export default async function TerminologyPage() {
  const session = await requireSession()
  await requirePermission('tenants:write')

  if (!session.activeTenantId) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Terminología</h1>
        <p className="text-muted-foreground">Selecciona una institución primero.</p>
      </div>
    )
  }

  const terms = await getTenantTerms(session.activeTenantId)

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Terminología</h1>
        <p className="text-sm text-muted-foreground">
          Personaliza el nombre de los conceptos académicos que verán los usuarios de tu institución
          (por ejemplo, &quot;Programa&quot; → &quot;Carrera&quot;, &quot;Pensum&quot; → &quot;Plan
          de estudios&quot;). Esto solo cambia las etiquetas visibles; la estructura de datos no
          cambia.
        </p>
      </header>

      <TerminologyForm initial={terms} />
    </div>
  )
}
