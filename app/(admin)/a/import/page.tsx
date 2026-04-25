import { requireSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ImportForm from './form'

export default async function ImportPage() {
  const session = await requireSession()
  await requirePermission('academic:write')

  if (!session.activeTenantId) {
    return <p className="text-muted-foreground">Selecciona un tenant primero.</p>
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Importacion de Datos</h1>
      <p className="text-muted-foreground">
        Sube un archivo CSV para importar estudiantes, programas o cursos en masa.
      </p>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">Subir archivo CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <ImportForm tenantId={session.activeTenantId} />
        </CardContent>
      </Card>

      <Card className="glass-subtle">
        <CardHeader>
          <CardTitle className="text-base">Formato esperado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Estudiantes</p>
            <code className="text-xs">full_name,email,document_type,document_number,phone</code>
          </div>
          <div>
            <p className="font-medium text-foreground">Programas</p>
            <code className="text-xs">name,code,modality,duration_periods,description</code>
          </div>
          <div>
            <p className="font-medium text-foreground">Inscripciones</p>
            <code className="text-xs">student_email,course_section_code,period_code</code>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
