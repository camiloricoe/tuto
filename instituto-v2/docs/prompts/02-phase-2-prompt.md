# Prompt Fase 2 — Módulo Académico

> **Cómo usar:** crea branch `phase/2-academic` y pega este prompt.

---

## Prompt

Vamos con Fase 2: módulo académico. Fase 1 (Auth + RBAC) está mergeada.

**Antes de codear:**

1. **Releé `CLAUDE.md`.**

2. **Leé estos archivos:**
   - `docs/phases/phase-2-academic.md`
   - `docs/specs/03-academic-module.md`
   - `docs/specs/01-data-model.md` sección 3 (catálogos académicos)
   - `docs/specs/09-security-and-rls.md` (para aplicar patterns A, B, C a las nuevas tablas)

3. **Confirmá que tenés claro:**
   - Las tablas de esta fase: `academic_programs`, `academic_periods`, `grading_schemes`, `subjects`, `courses`, `course_evaluations`, `enrollments`
   - Constraint crítico: suma de pesos de `course_evaluations` = 1.0 cuando el curso pasa a `active`
   - `courses.status`: `draft | active | closed`
   - `enrollments` tiene `final_grade` y `final_letter` NULL hasta que se cierre el curso
   - RLS: profesor ve solo sus cursos; estudiante ve solo sus cursos enrolados; admin ve todo en su tenant

4. **Preguntas antes de arrancar:**
   - ¿Crear un grading_scheme default "0 a 100 con letras ABCDEF" en el seed? (recomiendo sí)
   - Modalidad del primer programa a probar (fixed_curriculum, elective, o cohort)
   - ¿Permitir cursos sin profesor asignado inicialmente? (recomiendo sí, se asigna después)

5. **Proponé un plan con:**
   - Orden de migraciones SQL (7-9 archivos)
   - Políticas RLS por tabla aplicando los patterns del spec 09
   - Trigger de validación de pesos
   - Lista de Server Actions (en `app/actions/academic/`)
   - Validadores Zod (`lib/validators/academic.ts`)
   - Queries tipadas (`lib/db/academic.ts`)
   - Rutas UI en los 3 portales
   - Tests (integration + e2e principalmente)
   - Criterios de done

6. **Esperá aprobación.**

7. Durante ejecución:
   - Commits atómicos: una migración por commit, una Server Action por commit, un test por commit
   - Después de cada migración con RLS: escribir test que valide que la RLS funciona (cruce negativo)
   - Si detectás que un spec necesita más detalle, actualizalo **antes** de implementar

8. **Anti-patrones a evitar:**
   - No uses `select('*')` — nombrá columnas
   - No pongas lógica de negocio en Client Components
   - No hardcodees strings visibles, usá `messages/es.json`
   - No olvides el `logActivity` al final de cada Server Action exitosa

9. **Vertical slice check:**
   Al terminar la fase, los 3 portales deben reflejar el trabajo:
   - Admin: CRUD completo de la estructura académica
   - Teacher: lista de cursos asignados (sin notas todavía)
   - Student: lista de cursos enrolados (sin notas todavía)

10. **Al terminar:**
   - `pnpm typecheck && pnpm lint && pnpm test` pasa
   - Ejecutar manualmente el flujo completo: programa → período → materia → curso → evaluaciones → activar → enrolar → ver desde los 3 portales
   - Actualizar `docs/phases/00-roadmap.md`
   - PR con checklist de done completado

**Importante:**
- No implementes el módulo de notas ni pagos en esta fase.
- El UI de notas en el portal teacher debe existir como placeholder pero sin funcionalidad todavía (eso es fase 3).

Arrancá leyendo los archivos y hacé las preguntas.
