import Papa from 'papaparse'

export type ParseResult = {
  entity: string
  rows: Record<string, string>[]
  errors: string[]
}

const EXPECTED_COLUMNS: Record<string, string[]> = {
  students: ['full_name', 'email', 'document_type', 'document_number', 'phone'],
  programs: ['name', 'code', 'modality', 'duration_periods', 'description'],
  enrollments: ['student_email', 'course_section_code', 'period_code'],
}

export function parseCSV(entity: string, csvText: string): ParseResult {
  const errors: string[] = []

  const result = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
  })

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      errors.push(`Fila ${(err.row ?? 0) + 1}: ${err.message}`)
    }
  }

  const expectedCols = EXPECTED_COLUMNS[entity]
  const rows = result.data

  if (rows.length === 0) {
    return { entity, rows: [], errors: ['El archivo esta vacio o no tiene filas validas'] }
  }

  if (expectedCols) {
    const actualCols = Object.keys(rows[0] ?? {})
    const missing = expectedCols.filter((col) => !actualCols.includes(col))
    if (missing.length > 0) {
      errors.push(`Columnas faltantes: ${missing.join(', ')}`)
    }
  }

  // Row-level validation
  const validRows: Record<string, string>[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    const rowErrors = validateRow(entity, row, i + 2) // +2 for header row
    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
    } else {
      validRows.push(row)
    }
  }

  return { entity, rows: validRows, errors }
}

function validateRow(
  entity: string,
  row: Record<string, string>,
  rowNumber: number,
): string[] {
  const errors: string[] = []

  if (entity === 'students') {
    if (!row['full_name']?.trim()) {
      errors.push(`Fila ${rowNumber}: full_name es requerido`)
    }
    if (!row['email']?.trim() || !row['email'].includes('@')) {
      errors.push(`Fila ${rowNumber}: email invalido`)
    }
  }

  if (entity === 'programs') {
    if (!row['name']?.trim()) {
      errors.push(`Fila ${rowNumber}: name es requerido`)
    }
    if (!row['code']?.trim()) {
      errors.push(`Fila ${rowNumber}: code es requerido`)
    }
    if (!['presencial', 'virtual', 'hibrido'].includes(row['modality']?.toLowerCase() ?? '')) {
      errors.push(`Fila ${rowNumber}: modality debe ser presencial, virtual o hibrido`)
    }
    const dur = parseInt(row['duration_periods'] ?? '')
    if (isNaN(dur) || dur < 1) {
      errors.push(`Fila ${rowNumber}: duration_periods debe ser un numero positivo`)
    }
  }

  if (entity === 'enrollments') {
    if (!row['student_email']?.trim()) {
      errors.push(`Fila ${rowNumber}: student_email es requerido`)
    }
    if (!row['course_section_code']?.trim()) {
      errors.push(`Fila ${rowNumber}: course_section_code es requerido`)
    }
    if (!row['period_code']?.trim()) {
      errors.push(`Fila ${rowNumber}: period_code es requerido`)
    }
  }

  return errors
}
