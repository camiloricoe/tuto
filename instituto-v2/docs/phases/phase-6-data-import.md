# Fase 6 — Importación Masiva de Datos

**Objetivo**: sistema puede ingerir datos existentes (hoja de cálculo del sistema anterior, padrón del instituto, etc.) al momento del go-live, con validación previa (dry-run) y confirmación manual.

**Branch**: `phase/6-import`
**Duración estimada**: 1-2 días
**Spec a leer**: `/docs/specs/12-data-import.md`

---

## Resultado esperado al final

1. Admin entra a `/a/import`
2. Descarga plantilla de "Estudiantes" (CSV con headers + ejemplo)
3. Llena la plantilla con 500 estudiantes en Excel → guarda como CSV
4. Sube el archivo → sistema valida (dry-run)
5. Ve reporte: 498 válidos, 2 errores (emails duplicados)
6. Descarga CSV con solo los errores, corrige, sube de nuevo
7. Confirma import → sistema crea 500 usuarios, envía emails de invitación
8. Mismo flujo para profesores, cargos, pagos, notas, enrollments
9. `/a/import/history` muestra los imports realizados

---

## Migraciones SQL

### `YYYYMMDDHHMMSS_import_history.sql`

```sql
CREATE TABLE import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  entity text NOT NULL,
  executed_by uuid NOT NULL REFERENCES auth.users(id),
  executed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_rows int,
  processed_rows int DEFAULT 0,
  error_rows int DEFAULT 0,
  csv_file_key text,  -- referencia al bucket de Storage
  errors_summary jsonb,
  metadata jsonb
);

ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

-- Política: solo usuarios con permiso import:read pueden ver
CREATE POLICY "select_import_history_with_permission"
  ON import_history FOR SELECT
  USING (
    tenant_id IN (SELECT auth.user_tenants())
    AND auth.has_permission('import:read', tenant_id)
  );
```

### `YYYYMMDDHHMMSS_import_permissions.sql`

```sql
INSERT INTO permissions (code, description, resource, action) VALUES
  ('import:execute', 'Ejecutar importaciones masivas', 'import', 'execute'),
  ('import:read', 'Ver historial de importaciones', 'import', 'read');

-- Asignar a super_admin y admin por default
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles_catalog r, permissions p
WHERE r.code IN ('super_admin', 'admin')
  AND p.code IN ('import:execute', 'import:read');
```

### `YYYYMMDDHHMMSS_import_storage_bucket.sql`

Crear bucket `imports` con RLS para retención de CSVs importados (auditoría).

---

## Validadores Zod

`lib/validators/import.ts`:

Todos los schemas de fila según spec 12:

```ts
export const studentImportRowSchema = z.object({
  document_type: z.enum(['CC', 'CE', 'TI', 'PAS', 'NIT']),
  document_number: z.string().min(5).max(20),
  full_name: z.string().min(3).max(200),
  email: z.string().email(),
  phone: z.string().optional(),
  program_code: z.string().optional(),
  enrolled_on: z.coerce.date().optional(),
  send_invitation: z.coerce.boolean().default(true),
})

export const teacherImportRowSchema = z.object({...})
export const chargeImportRowSchema = z.object({...})
export const paymentImportRowSchema = z.object({...})
export const gradeImportRowSchema = z.object({...})
export const enrollmentImportRowSchema = z.object({...})

// Meta-schema para dispatch
export const importEntitySchema = z.enum([
  'students', 'teachers', 'charges', 'payments', 'grades', 'enrollments'
])
```

---

## Lógica de negocio

### `lib/import/parse.ts`

```ts
export async function parseCSV(
  file: File | string
): Promise<{
  rows: Record<string, string>[]
  columns: string[]
  delimiter: ',' | ';'
  encoding: 'utf-8' | 'latin-1'
}>

// Usa papaparse con auto-detect de delimiter y encoding
```

### `lib/import/validate.ts`

```ts
export async function validateImportBatch(
  entity: ImportEntity,
  rows: Record<string, string>[],
  tenantId: string
): Promise<{
  total: number
  valid: ValidRow[]
  invalid: InvalidRow[]
}>

// Por cada fila:
// 1. Zod schema de la entidad
// 2. Validaciones cruzadas: emails únicos, FKs existen, etc.
// Retorna detalle para UI
```

### `lib/import/execute.ts`

```ts
export async function executeImport(
  entity: ImportEntity,
  tenantId: string,
  executedBy: string,
  csvFileKey: string
): Promise<ImportResult>

// 1. Actualiza import_history: status='running'
// 2. Lee CSV de Storage
// 3. Parse + validate
// 4. Procesa en batches de 500:
//    - Insert en tabla destino
//    - Send invitations si aplica (queued)
//    - Update progress en import_history
// 5. Si un batch falla: rollback ese batch, continúa con siguientes
// 6. Actualiza status: 'completed' o 'failed'
// 7. logActivity: import.executed
```

### Insertadores específicos

`lib/import/insert-students.ts`:
```ts
export async function insertStudentBatch(
  rows: StudentImportRow[],
  tenantId: string,
  tx: Transaction
): Promise<void>

// Por cada row:
// 1. Crear user en auth.users con password random
// 2. Insertar user_profile
// 3. user_tenant_membership
// 4. Asignar rol 'student'
// 5. Si send_invitation=true: enqueue email
// 6. Si program_code: crear relación (si aplica)
```

Análogo para `insert-teachers`, `insert-charges`, etc.

---

## Server Actions

`app/actions/import/`:

### `upload.ts`

```ts
export async function uploadImportFile(formData: FormData) {
  // 1. requireSession + requirePermission('import:execute')
  // 2. Validar archivo (tipo, tamaño <10MB, <50k filas)
  // 3. Subir a bucket 'imports' con key única
  // 4. Retornar key
}
```

### `validate.ts`

```ts
export async function validateImport(input: {
  entity: ImportEntity
  fileKey: string
}): Promise<ValidationResult> {
  // 1. Auth + permiso
  // 2. Leer CSV de Storage
  // 3. Parse + validate
  // 4. Retornar summary para UI
}
```

### `execute.ts`

```ts
export async function confirmImport(input: {
  entity: ImportEntity
  fileKey: string
}): Promise<ImportResult> {
  // 1. Auth + permiso
  // 2. Crear import_history entry
  // 3. Ejecutar import (bloqueante en MVP; podría ser async en Fase 2+)
  // 4. Retornar resultado
}
```

### `history.ts`

```ts
export async function getImportHistory(
  tenantId: string,
  filters?: {}
): Promise<ImportHistoryEntry[]>
```

---

## Rutas UI

### `app/(admin)/a/import/page.tsx`

Pantalla principal con cards por entidad:
```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ 👥 Importar estudiantes     │  │ 🎓 Importar profesores      │
│ Cargar estudiantes en masa  │  │ Cargar profesores en masa   │
│ [Descargar plantilla]       │  │ [Descargar plantilla]       │
│ [Iniciar import]            │  │ [Iniciar import]            │
└─────────────────────────────┘  └─────────────────────────────┘

┌─────────────────────────────┐  ┌─────────────────────────────┐
│ 💳 Importar cargos          │  │ 💰 Importar pagos           │
│ ...                         │  │ ...                         │
└─────────────────────────────┘  └─────────────────────────────┘

┌─────────────────────────────┐  ┌─────────────────────────────┐
│ 📊 Importar notas           │  │ 📝 Importar enrollments     │
│ ...                         │  │ ...                         │
└─────────────────────────────┘  └─────────────────────────────┘

[Ver historial de imports]
```

### `app/(admin)/a/import/[entity]/page.tsx`

Flujo de import (wizard en una pantalla, 4 pasos):

**Paso 1 — Upload**
- Drag & drop zone
- Validación: CSV, <10MB
- Preview de primeras 10 filas con detección de columnas
- Botón "Validar archivo"

**Paso 2 — Validación**
- Spinner mientras valida
- Resultado:
  ```
  ✅ 498 filas válidas
  ❌ 2 filas con errores

  [Ver errores en detalle]
  [Descargar CSV de errores]
  ```
- Tabla expandible con filas problemáticas + razón del error

**Paso 3 — Confirmación**
- "Se importarán 498 filas. Las 2 filas con errores se ignorarán. ¿Continuar?"
- Botón destacado: "Confirmar import"
- Botón secundario: "Cancelar y volver"

**Paso 4 — Resultado**
- Progress bar si está corriendo
- Cuando termina:
  ```
  ✅ Import completado
  498 filas importadas exitosamente
  [Ver estudiantes creados]
  ```

### `app/(admin)/a/import/history/page.tsx`

Tabla con imports previos:
- Fecha, Usuario, Entidad, Total filas, Éxitos, Errores, Status, Acciones
- Click en fila → detalle con link al CSV original (si en retención)

### Templates CSV

`public/templates/`:
- `students-template.csv`
- `teachers-template.csv`
- `charges-template.csv`
- `payments-template.csv`
- `grades-template.csv`
- `enrollments-template.csv`

Cada uno con:
- Headers exactos
- Una fila con ejemplo válido
- Segunda fila con variaciones comunes
- Tercera fila vacía (para que el usuario empiece ahí)

Link desde cada card en `/a/import`.

---

## Tests

### Unit
- `tests/unit/import/parse-csv.test.ts`: UTF-8, UTF-8 BOM, Latin-1, comma vs semicolon
- `tests/unit/import/validate-student-row.test.ts`
- `tests/unit/import/cross-reference-validation.test.ts`: detectar emails duplicados

### Integration
- `tests/integration/import/students-batch-insert.test.ts`: inserta 100, verifica count
- `tests/integration/import/duplicate-email-detection.test.ts`
- `tests/integration/import/batch-rollback-on-error.test.ts`
- `tests/integration/import/large-file-streaming.test.ts`: 10,000 filas sin OOM
- `tests/integration/rls/import-history-tenant-isolation.test.ts`

### E2E
- `tests/e2e/admin-imports-students-happy-path.spec.ts`: flujo completo feliz
- `tests/e2e/admin-imports-with-errors.spec.ts`: parcial success
- `tests/e2e/admin-downloads-template.spec.ts`

---

## Criterios de done

### Funcionales
- [ ] Admin descarga plantilla CSV para cada entidad
- [ ] Admin sube CSV válido → dry-run muestra resultados correctos
- [ ] Admin confirma → data se crea en BD
- [ ] Emails de invitación se envían a estudiantes/profesores nuevos
- [ ] CSV con errores muestra detalle por fila
- [ ] Descarga de "CSV de errores" funciona
- [ ] Import de 5,000 filas completa sin timeout
- [ ] Import queda en `import_history` con metadata
- [ ] Activity log entry `import.executed`
- [ ] Usuario sin permiso `import:execute` → 403

### Técnicos
- [ ] `pnpm typecheck && pnpm lint && pnpm test` pasa
- [ ] Parseo de encoding múltiple funciona
- [ ] Batching no causa OOM con 10k filas
- [ ] RLS en `import_history`
- [ ] Buckets `imports` con policies correctas

---

## Deuda técnica esperable

- **Import asíncrono con notificación**: MVP es síncrono bloqueante (user espera). Para imports muy grandes (>10k filas), considerar queue + notificación por email cuando termina.
- **Continuación de imports fallidos**: MVP no permite retomar desde fila X. Si un import falla a mitad, hay que re-subir solo las faltantes.
- **Mapeo de columnas custom**: MVP requiere headers exactos. Fase 2+: permitir mapeo visual si headers no coinciden.
- **Preview post-import**: MVP redirige a lista general. Fase 2+: mostrar específicamente las filas importadas.
- **Rollback completo**: MVP no permite "deshacer un import". Hay que borrar manualmente si se hizo mal.

---

## Notas para uso real

### Día del go-live típico

1. Exportar data del sistema anterior a Excel
2. Limpiar y normalizar en Excel (emails válidos, fechas consistentes)
3. Guardar como CSV UTF-8
4. En `/a/import`:
   - Primero: estudiantes y profesores (generan los usuarios)
   - Luego: programas y cursos (crear desde UI, poco volumen)
   - Luego: enrollments (vinculan estudiantes a cursos)
   - Luego: cargos históricos + pagos históricos (estado de cuenta)
   - Opcional: notas históricas

### Validaciones previas recomendadas al humano

Antes de importar estudiantes:
- [ ] Todos los emails son únicos globalmente
- [ ] Todos los document_numbers son únicos en el tenant
- [ ] program_codes referenciados existen
- [ ] Fechas en formato consistente

Antes de importar pagos:
- [ ] Los estudiantes ya están importados
- [ ] Los cargos ya están importados
- [ ] Los montos no exceden los cargos referenciados
