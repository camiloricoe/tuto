# Spec 03 — Módulo Académico

## Conceptos

### Programa académico
Plan de estudio ofrecido por el tenant. Tiene una **modalidad**:
- `fixed_curriculum`: materias obligatorias por período (ej: colegio, técnico).
- `elective`: el estudiante elige materias por créditos (ej: universidad).
- `cohort`: grupo cerrado que avanza junto (ej: bootcamp, diplomado).

### Período académico
Instancia concreta de tiempo con inicio y fin. El `kind` indica duración típica (bimester, trimester, semester, etc.) pero las fechas son la fuente de verdad.

### Materia (subject)
Unidad curricular reutilizable. "Matemáticas I", "Marketing Digital". Pertenece a un programa.

### Curso (course)
Instancia de una materia en un período concreto, con un profesor y un grupo de estudiantes.
- "Matemáticas I – 2026-B3 – Grupo A"
- Tiene sus propias evaluaciones y esquema de notas.

### Evaluaciones del curso
Las piezas que componen la nota final: parciales, talleres, final. Cada una con peso (0..1).

### Enrollment
Vínculo estudiante ↔ curso. Guarda estado final cuando el curso cierra.

---

## Flujos

### Crear un programa
Rol: `admin` o `coordinator`.
1. `/a/academic/programs/new`
2. Ingresa código, nombre, modalidad, duración en períodos.
3. Al guardar, aparece en `/a/academic/programs`.

### Crear un período académico
Rol: `admin` o `coordinator`.
1. `/a/academic/periods/new`
2. Selecciona programa (o "todos"), tipo, fechas, código.
3. Constraints: no pueden solaparse dos períodos activos del mismo programa con el mismo `kind`.

### Crear materias
Rol: `admin` o `coordinator`.
1. `/a/academic/programs/[id]/subjects`
2. Agrega materias con código, nombre, créditos, esquema default.

### Abrir un curso
Rol: `admin` o `coordinator`.
1. `/a/academic/courses/new`
2. Selecciona materia, período, profesor, grupo, capacidad.
3. El curso arranca en estado `draft`.
4. Agrega las evaluaciones (parcial 1, parcial 2, final, taller) con pesos.
5. Al activar el curso: validación de que los pesos sumen 1.0.

### Enrolar estudiantes
Rol: `admin` o `coordinator`.
Tres formas:
1. **Manual**: desde `/a/academic/courses/[id]/roster` → agregar uno a uno.
2. **Masiva**: seleccionar múltiples estudiantes de una lista filtrable.
3. **Por programa**: enrolar a todos los estudiantes activos de un programa (útil para materias obligatorias).

Validaciones:
- El estudiante pertenece al tenant.
- El curso tiene capacidad disponible.
- El estudiante no está ya enrolado (constraint unique).

### Cerrar un curso
Rol: `admin` o `coordinator`.
1. Al final del período, el profesor ha publicado todas las notas.
2. Sistema calcula `final_grade` y `final_letter` de cada enrollment.
3. Admin hace clic en "Cerrar curso" → validación: todas las notas publicadas.
4. Curso pasa a `closed`. No se permiten más modificaciones (excepto por super_admin con registro en audit).

---

## Reglas de negocio

### Esquema de evaluación por curso
- Por defecto hereda el `grading_scheme` del subject.
- El profesor puede override al crear el curso (ej: subject usa escala 0-5 pero este curso específico usa 0-100).
- Una vez el curso pasa a `active`, el esquema queda congelado.

### Pesos de evaluaciones
- Cada evaluación tiene peso decimal entre 0 y 1.
- **Constraint de BD**: suma de pesos por curso = 1.0 (con tolerancia de 0.001) cuando status = `active`.
- Se valida al activar el curso y al modificar una evaluación.

### Cálculo de nota final
```
final_grade = Σ(grade.value × evaluation.weight) para evaluaciones publicadas
final_letter = mapeo según grading_scheme.letter_mapping
```

Si el esquema no usa letras, `final_letter` queda NULL.

### Retiro del estudiante
- Se cambia `enrollments.status` a `withdrawn`.
- No cuenta para cálculo de promedio del programa.
- Las notas existentes no se borran (audit).

---

## UI principal

### Admin / Coordinator
- `/a/academic/programs` — CRUD programas
- `/a/academic/periods` — CRUD períodos
- `/a/academic/subjects` — CRUD materias
- `/a/academic/courses` — CRUD cursos + asignación profesor
- `/a/academic/courses/[id]/roster` — enrolamiento
- `/a/academic/students/[id]/transcript` — histórico académico del estudiante

### Teacher
- `/t/courses` — lista de cursos asignados
- `/t/courses/[id]` — detalle: roster, evaluaciones, notas

### Student
- `/s/courses` — cursos actuales
- `/s/transcript` — histórico con todas las notas publicadas

---

## Validaciones Zod compartidas

```ts
// lib/validators/academic.ts
export const programSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(3).max(100),
  modality: z.enum(['fixed_curriculum', 'elective', 'cohort']),
  duration_periods: z.number().int().positive(),
})

export const periodSchema = z.object({
  program_id: z.string().uuid().nullable(),
  code: z.string().min(3).max(20),
  kind: z.enum(['bimester','trimester','quadrimester','semester','custom']),
  starts_on: z.coerce.date(),
  ends_on: z.coerce.date(),
}).refine(d => d.ends_on > d.starts_on, { message: 'ends_on must be after starts_on' })

// ... más schemas
```
