# Fase 3 — Módulo de Notas

**Objetivo**: profesores ingresan notas por evaluación, las publican atómicamente. Estudiantes las ven cuando están publicadas. Sistema calcula nota final al cerrar curso. Boletín PDF descargable.

**Branch**: `phase/3-grades`
**Duración estimada**: 2-3 días
**Specs a leer**: `/docs/specs/04-grades-module.md`, `/docs/specs/06-audit-and-logs.md`, `/docs/specs/07-notifications.md`

---

## Resultado esperado al final

1. Profesor entra a `/t/courses/[id]/grades`
2. Ve matriz: filas = estudiantes enrolados, columnas = evaluaciones
3. Ingresa notas en celdas (validadas contra grading_scheme)
4. Guarda como borrador
5. Selecciona notas y publica
6. Estudiantes reciben notification + email batcheado
7. Estudiante entra a `/s/grades`, ve las notas publicadas
8. Estudiante descarga boletín PDF del período
9. Admin cierra curso → se calculan notas finales automáticamente
10. Todo queda en `grades_audit` y `activity_log`

---

## Migraciones SQL

### `YYYYMMDDHHMMSS_grades.sql`
- Tabla `grades`
- Constraints:
  - `value >= 0` (validación adicional en app contra el scheme)
  - Status enum: `draft | published`
- UNIQUE `(enrollment_id, evaluation_id)`
- FK con ON DELETE CASCADE a enrollments/evaluations (hmm, pensar si preferimos RESTRICT — **decisión: RESTRICT**, con soft delete de enrollments)
- RLS según patrones del spec 09 (estudiante lee solo published propias, profesor del curso escribe, admin ve todo)

### `YYYYMMDDHHMMSS_grades_audit.sql`
- Tabla `grades_audit` con esquema estándar
- Trigger aplicado

### `YYYYMMDDHHMMSS_notifications.sql`
- Tabla `notifications` (si no existe aún)
- Tabla `email_deliveries`
- Tabla `notification_queue` (para batching)
- RLS

### `YYYYMMDDHHMMSS_grades_helpers.sql`
- Función `calculate_final_grade(enrollment_id)` — calcula promedio ponderado si todas las evaluaciones están published
- Función `close_course(course_id)` — itera enrollments, calcula finales, cambia course status

---

## Validadores Zod

`lib/validators/grades.ts`:
```ts
export const gradeInputSchema = z.object({
  enrollment_id: z.string().uuid(),
  evaluation_id: z.string().uuid(),
  value: z.number(),
  comment: z.string().max(500).nullable().optional(),
})

export const saveDraftsSchema = z.array(gradeInputSchema).max(500)

export const publishGradesSchema = z.object({
  grade_ids: z.array(z.string().uuid()).min(1).max(500),
})

export const editPublishedGradeSchema = z.object({
  grade_id: z.string().uuid(),
  value: z.number(),
  reason: z.string().min(10).max(500),
})

export const closeCourseSchema = z.object({
  course_id: z.string().uuid(),
})
```

---

## Lógica de negocio

### `lib/grades/calculate.ts`

```ts
export function calculateFinalGrade(
  grades: Grade[],           // solo published
  evaluations: CourseEvaluation[],
  scheme: GradingScheme
): { value: number | null; letter: string | null }

export function applyLetter(
  value: number,
  mapping: LetterMapEntry[] | null
): string | null

export function roundGrade(
  value: number,
  decimals: number = 2
): number
```

Todas puras, sin side effects. **Tests unitarios exhaustivos** (ver spec 10).

### `lib/grades/validate.ts`

```ts
// Validaciones que requieren DB (no se pueden hacer solo con Zod)
export async function validateGradeAgainstScheme(
  value: number,
  schemeId: string
): Promise<void>  // lanza si value fuera de rango

export async function validateTeacherCanGrade(
  teacherId: string,
  courseId: string
): Promise<void>
```

---

## Server Actions

`app/actions/grades.ts`:

### `saveDrafts(input: SaveDraftsInput)`
1. `requireSession + requirePermission('grades:write')`
2. `validateTeacherCanGrade`
3. Validar cada grade contra el scheme del curso
4. Upsert en `grades` con status `draft`
5. No notificaciones
6. `logActivity: grade.drafted`

### `publishGrades(input: PublishGradesInput)`
1. Auth + permisos
2. Validar que todas las grades pertenezcan a cursos del profe
3. **Transacción**:
   - UPDATE grades SET status='published', published_at=now(), published_by=user
   - Insert en `notification_queue` agrupado por (student_id, course_id)
4. `logActivity: grade.published`
5. Cron procesa queue cada 2 min (ver Fase 1, ya creado)

### `editPublishedGrade(input)`
1. Auth + permisos
2. Razón obligatoria mínimo 10 chars
3. Update grade
4. Insert notification al estudiante: `grade.modified_after_publish`
5. `logActivity: grade.modified_after_publish` con reason en metadata

### `closeCourse(input)`
1. Auth + permiso `courses:write`
2. Validar que todas las evaluaciones tengan grades publicadas para cada enrollment activo
3. Transacción:
   - UPDATE enrollments SET final_grade, final_letter, status='completed'
   - UPDATE courses SET status='closed'
4. Notifications a todos los estudiantes: `course.closed`
5. `logActivity: course.closed`

---

## Notifications

### `lib/notifications/grades.ts`

```ts
export async function queueGradePublishedNotification(params: {
  studentId: string
  courseId: string
  gradeIds: string[]
  tenantId: string
}): Promise<void>
```

Inserta en `notification_queue` o incrementa un contador si ya existe una entry pendiente para (student, course).

### `lib/notifications/processor.ts`

Endpoint `/api/cron/process-notification-queue`:
1. Lee entradas de `notification_queue` con `ready_at <= now()`
2. Agrupa por destinatario + kind
3. Para cada grupo: crea una notification in-app + un email delivery
4. Llama Resend
5. Marca queue entries como processed

Idempotente: si corre dos veces, no duplica.

### Templates de email

`lib/email/templates/grade-published.tsx`:
- Variante 1: "Nueva nota publicada en {course}"
- Variante 2: "{N} nuevas notas publicadas en {course}"

`lib/email/templates/grade-modified.tsx`:
- "Se modificó tu nota de {evaluation} en {course}" + razón

`lib/email/templates/course-closed.tsx`:
- "El curso {course} se cerró. Tu nota final: {grade}"

---

## Rutas UI

### Portal Teacher

#### `app/(teacher)/t/courses/[id]/grades/page.tsx`

**Componente principal: `<GradesMatrix />`**

Interfaz:
```
┌─────────────────┬────────┬────────┬────────┬────────┐
│ Estudiante      │ P1(30%)│ P2(30%)│ Fin(40%)│ Prom   │
├─────────────────┼────────┼────────┼────────┼────────┤
│ Juan Pérez      │  85 ✓  │  70 ✎  │   _    │  -     │
│ María García    │  90 ✓  │  82 ✓  │   _    │  -     │
│ Pedro López     │  65 ✓  │  _     │   _    │  -     │
└─────────────────┴────────┴────────┴────────┴────────┘

✓ = published    ✎ = draft    _ = sin nota
```

Features:
- Click en celda → input numérico con validación en vivo
- Indicador visual de estado por celda (colores)
- Selección múltiple (checkboxes o shift-click)
- Acciones: "Guardar borradores", "Publicar seleccionadas", "Publicar todas las del curso"
- Si nota publicada: edición requiere modal con razón

**UI técnica**: tabla con `tanstack-table` + Server Actions. Guardado con debounce en tiempo real para drafts.

#### `app/(teacher)/t/courses/[id]/grades/[gradeId]/history/page.tsx`
- Historial de cambios de una nota específica (query a `grades_audit`)

### Portal Admin

#### `app/(admin)/a/grades/audit/page.tsx`
Feed general de cambios en notas del tenant (permiso `audit:read`).

#### `app/(admin)/a/students/[id]/transcript/page.tsx`
Histórico académico completo del estudiante:
- Por período → cursos con notas finales
- Botón "Descargar boletín PDF" por período

### Portal Student

#### `app/(student)/s/grades/page.tsx`
- Selector de período (default: activo)
- Lista de cursos con tabla interna de evaluaciones y notas publicadas
- Promedio parcial y final

#### `app/(student)/s/grades/[periodId]/download/route.ts` (API route)
Genera el boletín PDF y devuelve como stream.

---

## Generación de PDF

### `lib/pdf/boletin.tsx`

Template `@react-pdf/renderer`:
- Encabezado: logo + datos del tenant
- Datos del estudiante
- Tabla por curso con evaluaciones, pesos, notas, promedio
- Resumen de período
- Footer: fecha de emisión, "Documento informativo"

### `lib/pdf/render.ts`

```ts
export async function renderBoletinPdf(data: BoletinData): Promise<Buffer>
```

### Route handler

`app/(student)/s/grades/[periodId]/download/route.ts`:
```ts
export async function GET(req, { params }) {
  const session = await requireSession()
  const { periodId } = params

  // Validar: el estudiante puede descargar su propio boletín
  const data = await getBoletinData(session.userId, periodId)

  const pdf = await renderBoletinPdf(data)

  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="boletin-${periodId}.pdf"`,
    },
  })
}
```

---

## Tests

### Unit
- `tests/unit/grades/calculate-final-grade.test.ts` (exhaustivo)
- `tests/unit/grades/apply-letter.test.ts`
- `tests/unit/grades/round-grade.test.ts`

### Integration
- `tests/integration/actions/save-drafts.test.ts`
- `tests/integration/actions/publish-grades.test.ts` — incluye atómico: si falla uno, no se publica ninguno
- `tests/integration/actions/edit-published-grade.test.ts` — razón obligatoria
- `tests/integration/actions/close-course.test.ts`
- `tests/integration/rls/grades-student-only-own-published.test.ts`
- `tests/integration/rls/grades-teacher-only-own-courses.test.ts`
- `tests/integration/audit/grades-audit-trigger.test.ts`
- `tests/integration/notifications/grade-published-batching.test.ts`

### E2E
- `tests/e2e/teacher-publishes-grades.spec.ts`: flujo completo
- `tests/e2e/student-sees-published-grades.spec.ts`
- `tests/e2e/student-does-not-see-drafts.spec.ts`
- `tests/e2e/student-downloads-boletin.spec.ts`

---

## Criterios de done

### Funcionales
- [ ] Profesor ingresa notas y guarda borrador (no visibles a estudiante)
- [ ] Profesor publica notas seleccionadas (atómico)
- [ ] Estudiante recibe email batcheado en <5 min después de publicación
- [ ] Estudiante ve solo notas publicadas propias
- [ ] Profesor de curso A no ve notas de curso B que no le fue asignado
- [ ] Edición de nota publicada requiere razón y queda en audit
- [ ] Cerrar curso calcula finales correctamente y cambia status
- [ ] Boletín PDF se descarga con data correcta
- [ ] No se puede cerrar curso si faltan notas por publicar

### Técnicos
- [ ] `pnpm typecheck && pnpm lint && pnpm test` pasa
- [ ] Cobertura `lib/grades/*` > 90% (cálculos críticos)
- [ ] Cobertura integration tests de RLS
- [ ] Audit trigger funciona y se verifica en test
- [ ] Cron de notifications queue procesa en <2min

---

## Deuda técnica esperable

- UI de matriz de notas: MVP funcional, mejoras de UX posteriores (keyboard navigation mejorado, bulk paste desde Excel, etc.)
- Comentarios en notas: guardados pero sin UI rica (solo texto plano)
- Boletín: un solo template por ahora; customización por tenant (logo, colores) puede ser Fase 2+
- Re-apertura de curso cerrado: solo super_admin via SQL, sin UI
