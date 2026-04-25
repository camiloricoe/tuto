# Spec 04 — Módulo de Notas

## Principios

1. **Draft vs Published**: las notas viven en `draft` hasta que el profesor las publica explícitamente. Solo las publicadas son visibles al estudiante.
2. **Inmutabilidad con audit**: las notas publicadas pueden editarse, pero cada cambio queda en `grades_audit` con valor anterior, nuevo, y quién lo hizo.
3. **Atomicidad**: publicar notas de un curso es una transacción — o se publican todas las que el profe marcó, o ninguna.
4. **Cálculos en el servidor, siempre.** Nunca confíes en cálculos que vengan del cliente.

---

## Flujo: profesor ingresa notas

### Pantalla `/t/courses/[id]/grades`

Muestra matriz editable:
- Filas: estudiantes enrolados (`enrollments.status = 'active'`)
- Columnas: evaluaciones del curso (`course_evaluations`)
- Cada celda: input numérico con validación según `grading_scheme`

### Estados de cada celda
- **Vacío**: no hay `grades` row.
- **Draft** (amarillo): existe, `status = 'draft'`.
- **Published** (verde): `status = 'published'`.
- **Modified after publish** (naranja): se editó después de publicar — sigue siendo published pero con indicador visual.

### Acciones

- **Guardar borrador**: hace upsert en `grades` con `status = 'draft'`. No notifica al estudiante.
- **Publicar seleccionadas**: cambia status a `published`, setea `published_at` y `published_by`. Dispara notificación al estudiante.
- **Publicar todas las del curso**: equivalente masivo.

---

## Reglas

### Rango permitido
El valor ingresado debe estar entre `grading_scheme.scale_min` y `scale_max`. Validación en Zod, constraint en DB.

### Cálculo de letra
Si `grading_scheme.uses_letters = true`:
```ts
function applyLetter(value: number, mapping: LetterMap[]): string | null {
  // mapping: [{min: 4.5, letter: 'A'}, {min: 4.0, letter: 'B'}, ...]
  // ordenado desc por min; primer match
  return mapping.find(m => value >= m.min)?.letter ?? null
}
```

### Cálculo de nota final del curso
Se dispara cuando:
- Se publica una nota.
- Se cierra el curso.

```ts
function calculateFinalGrade(
  grades: Grade[],  // solo published
  evaluations: CourseEvaluation[]
): number | null {
  // Si falta publicar alguna evaluación, final_grade = null
  const allPublished = evaluations.every(e =>
    grades.some(g => g.evaluation_id === e.id && g.status === 'published')
  )
  if (!allPublished) return null

  return evaluations.reduce((sum, e) => {
    const g = grades.find(x => x.evaluation_id === e.id)!
    return sum + g.value * e.weight
  }, 0)
}
```

Resultado se guarda en `enrollments.final_grade` y `enrollments.final_letter`.

### Edición post-publicación
- Permitida para el profesor del curso, con justificación obligatoria (`reason text` en el form).
- La justificación se guarda en `grades_audit.new_data.reason`.
- Admin puede también, queda en audit como admin override.
- Una vez el curso está `closed`, solo super_admin puede modificar (y queda en audit con énfasis).

### Historial visible
Cualquier usuario con `audit:read` puede ver el historial de una nota:
`/a/grades/[id]/history` — muestra todas las filas de `grades_audit` para ese `row_id`.

---

## Notificaciones relacionadas

- **`grade.published`**: cuando una nota pasa a published.
  - Email al estudiante: "Se publicó tu nota del [evaluación] de [curso]".
  - In-app notification con link a `/s/grades`.
- **`grade.modified_after_publish`**: cuando se edita una nota ya publicada.
  - Email + in-app al estudiante.
  - Entrada en `activity_log` con el `reason`.

Batching: si un profesor publica 30 notas de un curso de una vez, se envía **un solo email** al estudiante con el resumen: "Se publicaron N notas del curso X".

---

## Vista del estudiante

### `/s/grades`
- Selector de período (default: período activo).
- Lista de cursos del período con:
  - Estado general del curso
  - Notas publicadas por evaluación
  - Peso de cada evaluación
  - Promedio parcial (si hay notas publicadas)
  - Nota final (si el curso está cerrado)
- Las notas en `draft` **no se muestran**.

### `/s/transcript`
Histórico completo:
- Agrupado por período → por curso.
- Solo cursos con status `closed` aparecen con nota final definitiva.
- Botón "Descargar boletín PDF" por período.

---

## Validaciones

```ts
// lib/validators/grades.ts
export const gradeInputSchema = z.object({
  enrollment_id: z.string().uuid(),
  evaluation_id: z.string().uuid(),
  value: z.number().min(0).max(100),  // rango real se valida contra scheme en server
  comment: z.string().max(500).nullable().optional(),
})

export const publishGradesSchema = z.object({
  grade_ids: z.array(z.string().uuid()).min(1).max(500),
})

export const editPublishedGradeSchema = z.object({
  grade_id: z.string().uuid(),
  value: z.number(),
  reason: z.string().min(10).max(500),  // justificación obligatoria
})
```

---

## Tests críticos

1. `calculateFinalGrade` con diferentes combinaciones (nota faltante, notas parciales, todas publicadas).
2. `applyLetter` con diferentes mappings.
3. Un estudiante **no puede** leer (vía RLS) una nota en `draft` ni notas de otros estudiantes.
4. Un profesor **no puede** escribir notas de un curso que no le fue asignado.
5. Suma de pesos = 1.0 se enforza al activar curso.
6. Publicación masiva es atómica (si falla una, no se publica ninguna).
7. Al editar una nota publicada, la fila anterior queda en `grades_audit` con `operation = 'U'` y `reason` presente.
