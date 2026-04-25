# Fase 2 — Módulo Académico

**Objetivo**: admin modela el curriculum completo (programas, períodos, materias, cursos, evaluaciones). Profesores ven sus cursos asignados. Estudiantes ven sus materias.

**Branch**: `phase/2-academic`
**Duración estimada**: 2-3 días
**Specs a leer**: `/docs/specs/03-academic-module.md`, `/docs/specs/01-data-model.md` (secciones 3)

---

## Resultado esperado al final

1. Admin crea un programa académico "Técnico en Sistemas"
2. Admin crea un período "2026-B3" (bimestre 3 del 2026)
3. Admin crea materias del programa: "Matemáticas I", "Programación Básica"
4. Admin crea un grading_scheme: "Escala 0-100 con letras"
5. Admin abre un curso: "Matemáticas I - 2026-B3 - Grupo A" asignado al profesor X
6. Admin configura evaluaciones: Parcial 1 (30%), Parcial 2 (30%), Final (40%)
7. Admin activa el curso (pesos suman 1.0 → OK)
8. Admin enrolla 20 estudiantes en el curso
9. Profesor entra a su portal, ve el curso en su lista
10. Profesor ve el roster de estudiantes
11. Estudiantes enrolados ven el curso en su portal

---

## Migraciones SQL

### `YYYYMMDDHHMMSS_academic_programs.sql`
- Tabla `academic_programs`
- RLS (tenant isolation + permisos según spec 09)

### `YYYYMMDDHHMMSS_grading_schemes.sql`
- Tabla `grading_schemes`
- RLS

### `YYYYMMDDHHMMSS_academic_periods.sql`
- Tabla `academic_periods`
- Constraint: `ends_on > starts_on`
- RLS

### `YYYYMMDDHHMMSS_subjects.sql`
- Tabla `subjects`
- FK a `academic_programs` y `grading_schemes`
- RLS

### `YYYYMMDDHHMMSS_courses.sql`
- Tabla `courses`
- FK a `subjects`, `academic_periods`, `grading_schemes`
- `teacher_id` → `auth.users(id)` nullable
- Status enum: `draft | active | closed`
- RLS

### `YYYYMMDDHHMMSS_course_evaluations.sql`
- Tabla `course_evaluations`
- FK a `courses`
- Constraint: `weight >= 0 AND weight <= 1`
- RLS

### `YYYYMMDDHHMMSS_enrollments.sql`
- Tabla `enrollments`
- FK a `courses` y `student_id` → `auth.users(id)`
- UNIQUE `(student_id, course_id)`
- Status enum: `active | withdrawn | completed`
- `final_grade`, `final_letter` nullable (se llenan al cerrar curso)
- RLS

### `YYYYMMDDHHMMSS_enrollments_audit.sql`
- Tabla `enrollments_audit` con esquema estándar
- Trigger genérico aplicado

### `YYYYMMDDHHMMSS_course_activation_constraint.sql`
- Función que valida que la suma de weights de `course_evaluations` para un curso = 1.0 ± 0.001
- Trigger `BEFORE UPDATE` en `courses`: si `NEW.status = 'active'` y `OLD.status = 'draft'`, llama la función

### `YYYYMMDDHHMMSS_academic_seed.sql`
- Seed de un `grading_scheme` default por tenant (opcional: se puede hacer desde UI)
- Permisos académicos se asignan automáticamente a los roles

---

## Validadores Zod

`lib/validators/academic.ts`:
```ts
export const programSchema = z.object({
  code: z.string().min(2).max(20).regex(/^[A-Z0-9_-]+$/),
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  modality: z.enum(['fixed_curriculum', 'elective', 'cohort']),
  duration_periods: z.number().int().positive().max(50),
})

export const gradingSchemeSchema = z.object({
  name: z.string().min(3).max(50),
  scale_min: z.number(),
  scale_max: z.number(),
  passing_grade: z.number(),
  uses_letters: z.boolean(),
  letter_mapping: z.array(z.object({
    min: z.number(),
    letter: z.string().min(1).max(5),
  })).optional(),
}).refine(d => d.scale_max > d.scale_min, {
  message: 'scale_max debe ser mayor que scale_min',
})

export const periodSchema = z.object({
  program_id: z.string().uuid().nullable(),
  code: z.string().min(3).max(20),
  name: z.string().min(3).max(50),
  kind: z.enum(['bimester','trimester','quadrimester','semester','custom']),
  starts_on: z.coerce.date(),
  ends_on: z.coerce.date(),
  active: z.boolean().default(true),
}).refine(d => d.ends_on > d.starts_on, {
  message: 'ends_on debe ser después de starts_on',
})

export const subjectSchema = z.object({
  program_id: z.string().uuid(),
  code: z.string().min(2).max(20),
  name: z.string().min(3).max(100),
  credits: z.number().int().positive().optional().nullable(),
  default_grading_scheme_id: z.string().uuid(),
})

export const courseSchema = z.object({
  subject_id: z.string().uuid(),
  period_id: z.string().uuid(),
  teacher_id: z.string().uuid().nullable(),
  section_code: z.string().min(1).max(20),
  grading_scheme_id: z.string().uuid(),
  max_students: z.number().int().positive().max(500).optional(),
})

export const courseEvaluationSchema = z.object({
  course_id: z.string().uuid(),
  code: z.string().min(1).max(20),
  name: z.string().min(2).max(100),
  weight: z.number().min(0).max(1),
  sequence: z.number().int().nonnegative(),
  due_on: z.coerce.date().nullable().optional(),
})

export const enrollmentSchema = z.object({
  student_id: z.string().uuid(),
  course_id: z.string().uuid(),
})
```

---

## Server Actions

`app/actions/academic/`:

### `programs.ts`
- `createProgram(input)` — perm `programs:write`
- `updateProgram(id, input)` — perm `programs:write`
- `archiveProgram(id)` — soft delete, perm `programs:write`

### `periods.ts`
- `createPeriod(input)` — perm `programs:write`
- `updatePeriod(id, input)`
- Validación: no solapar dos períodos activos del mismo programa con el mismo kind

### `grading-schemes.ts`
- `createGradingScheme(input)`
- `updateGradingScheme(id, input)` — falla si hay cursos activos usándolo (forzar crear nuevo)

### `subjects.ts`
- `createSubject(input)`
- `updateSubject(id, input)`

### `courses.ts`
- `createCourse(input)` — crea en status `draft`
- `updateCourse(id, input)` — solo si status = `draft`
- `activateCourse(id)` — valida pesos = 1.0, cambia status
- `closeCourse(id)` — calcula nota final de cada enrollment, cambia status
- `assignTeacher(courseId, teacherId)`

### `evaluations.ts`
- `createEvaluation(input)`
- `updateEvaluation(id, input)` — solo si curso en draft
- `deleteEvaluation(id)` — solo si curso en draft

### `enrollments.ts`
- `enrollStudent(studentId, courseId)` — valida capacidad
- `enrollStudents(studentIds, courseId)` — masivo
- `enrollAllProgramStudents(programId, courseId)` — para materias obligatorias
- `withdrawStudent(enrollmentId)`

Todas con `requireSession + Zod + requirePermission + transacción + logActivity`.

---

## Rutas UI

### Portal Admin (`app/(admin)/a/academic/`)

#### `programs/page.tsx`
Lista con tabla:
- Código, nombre, modalidad, duración, # materias, # cursos activos
- Botón "Nuevo programa"

#### `programs/new/page.tsx`
Form con React Hook Form + Zod

#### `programs/[id]/page.tsx`
Detalle del programa con tabs:
- General (edit de datos)
- Materias (lista + nueva)
- Períodos asociados

#### `periods/page.tsx`
Lista de períodos.

#### `periods/new/page.tsx`, `periods/[id]/page.tsx`

#### `grading-schemes/page.tsx` + CRUD

#### `courses/page.tsx`
Lista con filtros: programa, período, status, profesor.

#### `courses/new/page.tsx`
Wizard:
1. Seleccionar subject + período + profesor + grupo
2. Configurar evaluaciones (form dinámico con suma de pesos)
3. Review y activar

#### `courses/[id]/page.tsx`
Detalle con tabs:
- General
- Evaluaciones (edit si draft)
- Roster (listado de enrollments)
- Actividad (activity_log filtrado)

#### `courses/[id]/roster/page.tsx`
- Listado de estudiantes enrolados
- Botón "Enrolar estudiantes" → modal con 3 opciones: manual, masivo, por programa

### Portal Teacher (`app/(teacher)/t/`)

#### `courses/page.tsx`
Lista de cursos donde el user es `teacher_id`. Cards con:
- Nombre del curso, período, # estudiantes
- Link a detalle

#### `courses/[id]/page.tsx`
Detalle con:
- Info del curso
- Roster (read-only en esta fase; edición de notas viene en fase 3)

### Portal Student (`app/(student)/s/`)

#### `dashboard/page.tsx`
Cards con:
- Cursos actuales (enrollments del período activo)
- Placeholder para "notas" y "pagos" (se llenan en fases siguientes)

#### `courses/page.tsx`
Lista de cursos del período activo.

#### `courses/[id]/page.tsx`
Detalle: profesor, materia, período, evaluaciones (sin notas aún).

---

## Queries en `lib/db/`

Crear queries tipadas reutilizables:

```ts
// lib/db/academic.ts
export async function getProgramsForTenant(tenantId: string)
export async function getProgramById(id: string)
export async function getPeriodsForTenant(tenantId: string, filters?)
export async function getActivePeriod(tenantId: string, programId?: string)
export async function getCoursesForTeacher(teacherId: string, periodId?: string)
export async function getCoursesForStudent(studentId: string, periodId?: string)
export async function getCourseWithEvaluations(courseId: string)
export async function getCourseRoster(courseId: string)
// ...
```

Todas tipadas; no se usa `select('*')`.

---

## Componentes compartidos

`components/academic/`:
- `ProgramCard.tsx`
- `CourseCard.tsx`
- `EvaluationForm.tsx` (form dinámico con array de evaluaciones + validación de pesos)
- `StudentPicker.tsx` (para enrollments: search + multi-select)
- `PeriodSelector.tsx` (dropdown reutilizable)

---

## Tests

### Unit
- `tests/unit/academic/weights-validation.test.ts`
- `tests/unit/academic/period-overlap.test.ts`
- `tests/unit/validators/academic.test.ts`

### Integration
- `tests/integration/actions/create-course-flow.test.ts`: draft → evaluaciones → activate
- `tests/integration/actions/enroll-students.test.ts`
- `tests/integration/rls/academic-tenant-isolation.test.ts`
- `tests/integration/rls/teacher-sees-only-own-courses.test.ts`
- `tests/integration/rls/student-sees-only-enrolled-courses.test.ts`
- `tests/integration/audit/enrollments-audit.test.ts`

### E2E
- `tests/e2e/admin-creates-full-academic-setup.spec.ts`: crear programa → período → materia → curso → evaluaciones → activar
- `tests/e2e/teacher-sees-assigned-courses.spec.ts`
- `tests/e2e/student-sees-enrolled-courses.spec.ts`

---

## Criterios de done

### Funcionales
- [ ] Admin completa el flujo: programa → período → subject → course → evaluaciones → activar
- [ ] No puede activar curso con pesos ≠ 1.0
- [ ] Enrolamiento manual y masivo funcionan
- [ ] Teacher ve solo sus cursos
- [ ] Student ve solo sus cursos
- [ ] RLS: admin de tenant A no ve cursos de tenant B
- [ ] Activity log registra cada operación académica
- [ ] Audit trigger de enrollments dispara

### Técnicos
- [ ] `pnpm typecheck && pnpm lint && pnpm test` pasa
- [ ] Cobertura en `lib/db/academic.ts` > 70%
- [ ] Todos los Server Actions siguen el patrón estándar

---

## Deuda técnica esperable

- Editor de grading scheme avanzado (UI de mapping de letras): MVP simple, mejorable
- Enrollment masivo con CSV directo: Fase 6
- Rotación de profesor en curso activo: no contemplado (forzar cerrar y abrir nuevo)
- Períodos no lineales (año académico con verano, etc.): modelo lo permite, UI no lo optimiza
