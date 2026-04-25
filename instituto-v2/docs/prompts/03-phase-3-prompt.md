# Prompt Fase 3 — Módulo de Notas

> **Cómo usar:** crea branch `phase/3-grades` y pega este prompt.

---

## Prompt

Vamos con Fase 3: módulo de notas. Fase 2 (Académico) está mergeada.

**Antes de codear:**

1. **Releé `CLAUDE.md`.**

2. **Leé estos archivos:**
   - `docs/phases/phase-3-grades.md`
   - `docs/specs/04-grades-module.md`
   - `docs/specs/06-audit-and-logs.md` (trigger genérico + activity log)
   - `docs/specs/07-notifications.md` (batching de emails)
   - `docs/specs/09-security-and-rls.md` pattern B (resource ownership para notas)

3. **Confirmá que tenés claro:**
   - Estados de una nota: `draft` (solo profe la ve) → `published` (estudiante la ve)
   - Publicación es **atómica**: o se publican todas las seleccionadas o ninguna
   - Edición post-publicación requiere **razón obligatoria** (mínimo 10 chars)
   - Cálculo de nota final: solo si TODAS las evaluaciones están published
   - Cerrar curso: calcula finales de cada enrollment activo, cambia status a `closed`
   - **Trigger genérico de auditoría** se crea en esta fase (no estaba antes) y se aplica a `grades`
   - Notificaciones batcheadas: agrupa por (student, course) en ventana de 5min

4. **Preguntas antes de arrancar:**
   - Redondeo de notas finales: ¿2 decimales? (recomiendo sí)
   - Si un estudiante se retira (`withdrawn`) durante el curso, ¿sus notas se mantienen o se archivan? (recomiendo mantener, no cuenta para promedio del programa)
   - Boletín PDF: ¿on-demand cada descarga o cachear? (recomiendo on-demand por simplicidad)
   - Ventana de batching de notifications: ¿5 min como dice el spec o ajustamos?

5. **Proponé un plan con:**
   - Migraciones SQL (grades + audit + notifications queue)
   - **Crítico**: implementación de la función genérica `audit.log_changes()` y aplicación a `grades`
   - Lógica de negocio en `lib/grades/` (cálculos puros, testeables)
   - Server Actions: `saveDrafts`, `publishGrades`, `editPublishedGrade`, `closeCourse`
   - Endpoint cron `/api/cron/process-notification-queue` (si no existe aún)
   - Template de boletín PDF
   - Route handler para descarga de PDF
   - Matriz de notas en UI (componente complejo — pensalo bien)
   - Tests exhaustivos de cálculos (unit) y RLS (integration)
   - Tests e2e del flujo completo

6. **Esperá aprobación.**

7. Durante ejecución:
   - **Los cálculos son lo más crítico**: tests exhaustivos de `calculateFinalGrade` y `applyLetter`
   - **Atomicidad de publicación**: test que verifica que si una nota falla al publicar, ninguna se publica
   - **Audit trigger**: test que verifica que un UPDATE a `grades` deja registro en `grades_audit` con `old_data` y `new_data` correctos
   - **RLS**: tests negativos (estudiante no ve drafts, estudiante no ve notas ajenas, profesor no ve notas de cursos ajenos)
   - Commits atómicos por funcionalidad

8. **UI de matriz de notas:**
   - Componente principal en `components/grades/GradesMatrix.tsx`
   - Client Component (es interactivo), pero toda lógica de BD es Server Actions
   - Guardado de drafts con debounce en tiempo real
   - Indicadores visuales por estado de celda (vacío/draft/published/modified)
   - Selección múltiple para publicar
   - Modal con razón al editar nota ya publicada

9. **Notificaciones:**
   - Cuando se publican notas: insert en `notification_queue`, no enviar email inmediato
   - Cron corre cada 2 min, agrupa por (student, course, kind), envía 1 email con resumen
   - In-app notification sí se crea inmediato
   - Template email con React Email

10. **Al terminar:**
    - `pnpm typecheck && pnpm lint && pnpm test` pasa
    - Cobertura `lib/grades/*` > 90%
    - Manualmente: publicar 10 notas → verificar que llega 1 solo email al estudiante (no 10)
    - Cerrar un curso con todas las notas publicadas → verificar cálculo de finales
    - Descargar boletín PDF de un estudiante con notas → verificar contenido
    - Actualizar roadmap

**Importante:**
- No implementes pagos todavía.
- El trigger genérico de auditoría que creás en esta fase se reutiliza en fases 4+.
- La matriz de notas es el componente más complejo del sistema. Tomate el tiempo necesario.

Arrancá leyendo y hacé las preguntas.
