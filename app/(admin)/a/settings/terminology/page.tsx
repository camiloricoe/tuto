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

      <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Los conceptos académicos se separan en dos planos:{' '}
        <strong className="text-foreground">catálogo</strong> (qué se puede enseñar —{' '}
        <em>Materia / Asignatura</em>) y{' '}
        <strong className="text-foreground">oferta</strong> (cuándo y por quién se dicta —{' '}
        <em>Curso / Dictado</em>). Si tu institución usa una sola palabra para ambos, déjalos con
        etiquetas distintas para que el sistema pueda diferenciarlos internamente.
      </div>

      <TerminologyForm initial={terms} />
    </div>
  )
}
