# Spec 12 — Importación Masiva de Datos

## Propósito

Facilitar la migración desde sistemas existentes (Excel, otro software, papel digitalizado) al momento del go-live, y permitir cargas recurrentes (ej: listado de estudiantes nuevos al inicio de período).

---

## Entidades importables

### MVP

1. **Estudiantes** (+ cuentas de acceso)
2. **Profesores**
3. **Cargos históricos** (deudas que vienen del sistema anterior)
4. **Pagos históricos** (para tener historial completo)
5. **Notas históricas** (por si se quiere portar)
6. **Enrollments** (inscripciones en cursos actuales)

### No MVP
- Programas académicos (son pocos, se crean manualmente)
- Materias (idem)
- Configuración de grading_schemes (idem)

---

## Estrategia de importación

### Enfoque: dry-run + confirm

Cada import pasa por dos fases:

**Fase 1 — Validación (dry-run):**
- Parsear CSV
- Validar cada fila con Zod
- Verificar constraints (emails únicos, referencias existentes, etc.)
- Generar reporte: X filas válidas, Y filas con errores, lista de errores por fila

**Fase 2 — Confirmación:**
- Si el dry-run es aceptable, el admin confirma
- Se ejecuta la carga en transacción
- Se genera log detallado de lo importado
- Se envían emails de bienvenida (si aplica)

### Batching

Para cargas grandes (>1000 filas):
- Batches de 500 filas por transacción
- Progreso visible en UI
- Si un batch falla, se detiene y se rollback ese batch (los anteriores quedan commiteados)
- Continuable: admin puede retomar desde la fila X

---

## Formato de CSV

### Convenciones

- **Encoding**: UTF-8 con BOM (compatible con Excel)
- **Separador**: coma (`,`) o punto y coma (`;`) auto-detectado
- **Decimal**: punto (`.`) para moneda y notas
- **Fechas**: ISO 8601 (`YYYY-MM-DD`) o formato DD/MM/YYYY (auto-detectado)
- **Booleanos**: `true`/`false`, `1`/`0`, `sí`/`no` (case-insensitive)
- **Primera fila**: headers obligatorios
- **Nulls**: celda vacía (no escribir "NULL")

### Ejemplo: estudiantes

```csv
document_type,document_number,full_name,email,phone,program_code,enrolled_on
CC,1234567890,Juan Pérez,juan@example.com,+573001234567,TECN-SIS,2026-01-15
CC,1098765432,María García,maria@example.com,+573007654321,DIPL-MKT,2026-02-01
```

Columnas requeridas por entidad — ver sección "Schemas por entidad" abajo.

---

## UI del importador

### `/a/import`

Pantalla principal con cards por entidad:
- "Importar estudiantes"
- "Importar profesores"
- "Importar cargos históricos"
- "Importar pagos históricos"
- "Importar notas históricas"
- "Importar enrollments"

Cada card tiene:
- Descripción
- Link a "Descargar plantilla CSV" (con headers + 1 fila de ejemplo)
- Link a "Ver documentación" (página con detalle de cada columna)
- Botón "Iniciar import"

### Flujo de import

**Paso 1: Upload**
- Drag & drop o file picker
- Validación: es CSV, < 10MB, < 50,000 filas
- Preview de primeras 10 filas con detección de columnas

**Paso 2: Mapeo de columnas** (opcional)
- Si los headers no coinciden exactamente, permitir mapeo manual
- Guardar mapeo para futuras cargas del mismo tipo

**Paso 3: Dry-run**
- Botón "Validar archivo"
- Backend procesa y devuelve:
  - Total filas
  - Válidas vs con errores
  - Tabla con errores por fila (columna "error" explicando)
  - Preview de filas válidas
- Opción "Descargar errores" (CSV con solo las filas problemáticas + columna error)

**Paso 4: Confirmación**
- Solo aparece si hay al menos 1 fila válida
- Mensaje: "Se van a importar N filas. Las M filas con errores se ignorarán. ¿Continuar?"
- Botón de confirmación grande
- Post-import: pantalla de resultado + link a entidades creadas

### Histórico de imports

`/a/import/history`:
- Tabla con imports previos (usuario, fecha, entidad, # filas, # éxitos, # errores)
- Click en uno → detalle con CSV original (almacenado en Storage)
- Útil para auditoría y troubleshooting

---

## Schemas por entidad

### Estudiantes

```ts
export const studentImportRowSchema = z.object({
  document_type: z.enum(['CC', 'CE', 'TI', 'PAS', 'NIT']),
  document_number: z.string().min(5).max(20),
  full_name: z.string().min(3).max(200),
  email: z.string().email(),
  phone: z.string().optional(),
  program_code: z.string().optional(),  // si se quiere enrollar automáticamente
  enrolled_on: z.coerce.date().optional(),
  send_invitation: z.coerce.boolean().default(true),
})
```

**Efectos:**
- Crea `user_profiles` con datos
- Crea `auth.users` con password temporal aleatorio
- Asigna rol `student` en el tenant
- Si `send_invitation=true`: envía email de activación
- Si `program_code`: crea relación con programa (no curso, eso es enrollments)

**Constraints:**
- `email` único globalmente
- `(tenant_id, document_number)` único
- `program_code` debe existir en el tenant

### Profesores

```ts
export const teacherImportRowSchema = z.object({
  document_type: z.enum(['CC', 'CE', 'PAS']),
  document_number: z.string().min(5).max(20),
  full_name: z.string().min(3).max(200),
  email: z.string().email(),
  phone: z.string().optional(),
  send_invitation: z.coerce.boolean().default(true),
})
```

### Cargos históricos

```ts
export const chargeImportRowSchema = z.object({
  student_document: z.string(),  // para lookup
  concept_code: z.string(),       // FK a payment_concepts
  program_code: z.string().optional(),
  period_code: z.string().optional(),
  amount: z.number().positive().multipleOf(0.01),
  due_date: z.coerce.date(),
  status: z.enum(['pending', 'paid', 'partial', 'void']).default('pending'),
  notes: z.string().optional(),
})
```

**Efectos:** insert en `student_charges`.

### Pagos históricos

```ts
export const paymentImportRowSchema = z.object({
  student_document: z.string(),
  amount: z.number().positive().multipleOf(0.01),
  method: z.enum(['cash','transfer','check','other']),
  reference: z.string().optional(),
  paid_on: z.coerce.date(),
  notes: z.string().optional(),
  allocate_to_charge_refs: z.string().optional(),  // CSV de charge_ids o 'auto' para FIFO
})
```

**Efectos:**
- Insert en `payments` con status `confirmed`
- Si `allocate_to_charge_refs='auto'`: FIFO contra cargos pending del estudiante
- Si CSV de IDs: allocations explícitas
- **Nota**: no genera receipts para imports históricos (marca `notes='imported'`)

### Notas históricas

```ts
export const gradeImportRowSchema = z.object({
  student_document: z.string(),
  course_code: z.string(),
  evaluation_code: z.string(),
  value: z.number(),
  letter: z.string().optional(),
  comment: z.string().optional(),
  published_on: z.coerce.date().optional(),  // si viene, marca published
})
```

### Enrollments

```ts
export const enrollmentImportRowSchema = z.object({
  student_document: z.string(),
  course_code: z.string(),
  status: z.enum(['active','withdrawn','completed']).default('active'),
  enrolled_on: z.coerce.date().optional(),
  final_grade: z.number().optional(),
  final_letter: z.string().optional(),
})
```

---

## Seguridad

- Permiso requerido: `import:execute` (solo super_admin y admin por default)
- Archivos CSV se suben a bucket `imports/` con RLS
- Después del import exitoso, CSV se mantiene 90 días para auditoría
- Activity log entry por cada import: `import.executed` con metadata (entity, rows, errors)
- Datos importados marcan trigger de auditoría como todos los demás

---

## Implementación técnica

### Librería de parseo
`papaparse` (popular, confiable, streaming).

### Flujo en código

```ts
// Server Action
export async function validateImport(
  entity: ImportEntity,
  csvFile: File
): Promise<ValidationResult> {
  await requirePermission('import:execute')

  const text = await csvFile.text()
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })

  const schema = getSchemaForEntity(entity)
  const results = parsed.data.map((row, index) => {
    const result = schema.safeParse(row)
    return { index, row, ok: result.success, error: result.error?.message }
  })

  // Además: validar constraints cruzados (emails únicos, FK existen)
  await validateCrossReferences(entity, results)

  return {
    total: results.length,
    valid: results.filter(r => r.ok).length,
    errors: results.filter(r => !r.ok),
  }
}

export async function executeImport(
  entity: ImportEntity,
  csvFileKey: string  // file ya subido a Storage
): Promise<ImportResult> {
  await requirePermission('import:execute')

  // Leer de Storage
  const file = await storage.from('imports').download(csvFileKey)
  const text = await file.text()
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })

  // Procesar en batches
  const batchSize = 500
  let processed = 0
  const errors = []

  for (let i = 0; i < parsed.data.length; i += batchSize) {
    const batch = parsed.data.slice(i, i + batchSize)
    try {
      await db.transaction(async (tx) => {
        for (const row of batch) {
          await insertRow(tx, entity, row)
        }
      })
      processed += batch.length
    } catch (err) {
      errors.push({ batchStart: i, error: err.message })
      break  // Detener en primer batch fallido
    }
  }

  await logActivity({
    actionCode: 'import.executed',
    resourceType: entity,
    metadata: { total: parsed.data.length, processed, errors },
  })

  return { processed, errors }
}
```

---

## Tests críticos

1. Import de 100 estudiantes con data válida → 100 creados
2. Import con 1 email duplicado → reporta error en esa fila, no inserta ninguna
3. Import con columnas extra → las ignora, no falla
4. Import con columnas faltantes → error en fase dry-run
5. Import grande (10,000 filas) con 10 errores → procesa las 9990 válidas
6. Parseo de encoding: UTF-8, UTF-8 con BOM, Latin-1 → maneja correctamente
7. Parseo de separador: coma vs punto y coma → auto-detecta
8. Fechas en múltiples formatos → parsea correctamente
9. Usuario sin permiso `import:execute` → 403
10. Import registra en activity_log

---

## Plantillas CSV

Cada entidad tiene un archivo template en `/public/templates/`:
- `students-template.csv`
- `teachers-template.csv`
- `charges-template.csv`
- `payments-template.csv`
- `grades-template.csv`
- `enrollments-template.csv`

Cada uno con:
- Row 0: headers
- Row 1: ejemplo válido
- Row 2: otro ejemplo con variaciones

Link a descargar desde la UI de import.
