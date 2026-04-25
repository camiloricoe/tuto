'use client'

import { useState, useTransition } from 'react'
import { parseCSV } from '@/lib/import/parse'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type Props = { tenantId: string }

type ParseResult = {
  entity: string
  rows: Record<string, string>[]
  errors: string[]
}

export default function ImportForm({ tenantId: _tenantId }: Props) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<ParseResult | null>(null)
  const [entity, setEntity] = useState('students')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fileInput = form.elements.namedItem('csvFile') as HTMLInputElement
    const file = fileInput.files?.[0]
    if (!file) return

    startTransition(async () => {
      const text = await file.text()
      const parsed = parseCSV(entity, text)
      setResult(parsed)
    })
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="entity">Tipo de datos</Label>
          <select
            id="entity"
            name="entity"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="students">Estudiantes</option>
            <option value="programs">Programas</option>
            <option value="enrollments">Inscripciones</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="csvFile">Archivo CSV</Label>
          <input
            id="csvFile"
            name="csvFile"
            type="file"
            accept=".csv,text/csv"
            required
            className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
          />
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? 'Procesando...' : 'Previsualizar importacion'}
        </Button>
      </form>

      {result && (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center gap-4 text-sm">
            <span>
              <span className="font-medium">{result.rows.length}</span> filas validas
            </span>
            {result.errors.length > 0 && (
              <span className="text-destructive">
                <span className="font-medium">{result.errors.length}</span> errores
              </span>
            )}
          </div>

          {result.errors.length > 0 && (
            <ul className="space-y-1 text-xs text-destructive">
              {result.errors.slice(0, 10).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {result.errors.length > 10 && (
                <li>... y {result.errors.length - 10} errores mas</li>
              )}
            </ul>
          )}

          {result.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {Object.keys(result.rows[0] ?? {}).map((col) => (
                      <th key={col} className="px-2 py-1 text-left font-medium text-muted-foreground">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-2 py-1">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.rows.length > 5 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  ... y {result.rows.length - 5} filas mas
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
