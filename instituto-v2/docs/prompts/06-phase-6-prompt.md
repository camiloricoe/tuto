# Prompt Fase 6 — Importación Masiva

> **Cómo usar:** crea branch `phase/6-import` y pega este prompt.

---

## Prompt

Vamos con Fase 6: importación masiva de datos vía CSV. Fase 5 (Reportes + Hardening) está mergeada. Esta es la última fase del MVP.

**Esta fase es crítica para el go-live**: permite migrar toda la data del sistema anterior (Excel, otro software) al nuevo sistema de una sola vez.

**Antes de codear:**

1. **Releé `CLAUDE.md`.**

2. **Leé estos archivos:**
   - `docs/phases/phase-6-data-import.md`
   - `docs/specs/12-data-import.md`
   - `docs/specs/09-security-and-rls.md` (el importador es endpoint sensible)

3. **Confirmá que tenés claro:**
   - Flujo: **upload → dry-run (validar) → confirmar → ejecutar**
   - 6 entidades importables: estudiantes, profesores, cargos, pagos, notas, enrollments
   - Dry-run muestra errores sin tocar la BD
   - Ejecución en batches de 500 filas para no colgar la UI
   - Cada import queda en `import_history` con auditoría completa
   - Archivos CSV se mantienen en bucket `imports/` por 90 días (auditoría)
   - Permiso requerido: `import:execute` (crear en esta fase)
   - Auto-detect de encoding (UTF-8, UTF-8 BOM, Latin-1) y separador (`,` o `;`)

4. **Preguntas antes de arrancar:**
   - Tamaño máximo de archivo: spec dice 10MB — ¿OK? (recomiendo sí para MVP)
   - Filas máximas por import: spec dice 50,000 — ¿OK?
   - Si un batch falla a mitad de import, ¿rollback total o continuar con siguientes batches? (spec dice: rollback del batch y continuar, detener solo si hay fallo crítico)
   - ¿Enviar emails de invitación inmediatamente al importar estudiantes/profesores o encolarlos? (recomiendo encolarlos para no saturar Resend)
   - ¿Permitir import de notas históricas? (spec dice sí, pero son complejas — ¿confirmamos?)

5. **Proponé un plan con:**
   - Migraciones SQL: `import_history`, permisos, bucket Storage
   - Validadores Zod para cada entidad (6 schemas)
   - Lógica en `lib/import/`:
     - `parse.ts`: CSV parsing con auto-detect
     - `validate.ts`: validación por fila + cross-references
     - `execute.ts`: batch processing
     - Insertadores específicos: `insert-students.ts`, `insert-teachers.ts`, etc.
   - Server Actions: `uploadImportFile`, `validateImport`, `confirmImport`, `getImportHistory`
   - Rutas UI:
     - `/a/import` (dashboard)
     - `/a/import/[entity]` (wizard de 4 pasos)
     - `/a/import/history`
   - Plantillas CSV en `public/templates/` (6 archivos)
   - Tests: unit de parsing, integration de batch insert, e2e de flujo completo

6. **Esperá aprobación.**

7. **Decisiones de UX crítico:**
   - El dry-run debe ser **rápido** (<3s para 5k filas). Si no, el usuario lo odia.
   - Los errores deben ser **accionables**: no "error en fila 47" sino "fila 47: email 'juan@' no es válido"
   - Descarga de CSV de errores: solo las filas problemáticas + columna extra con el error
   - Botón "Confirmar import" debe ser destacado y con confirmación explícita ("Se importarán N filas. ¿Continuar?")

8. **Tests críticos:**
   - Parseo UTF-8, UTF-8 con BOM, Latin-1 → todos funcionan
   - Parseo con separador `,` vs `;` → auto-detecta
   - Fechas en formato `YYYY-MM-DD` y `DD/MM/YYYY` → ambos parsean
   - 100 estudiantes válidos → 100 creados en BD
   - 99 válidos + 1 duplicado → reporta error en dry-run, no inserta ninguno
   - 10,000 filas → procesa en batches sin OOM
   - Usuario sin permiso `import:execute` → 403
   - Import de tenant A no toca datos tenant B

9. **Consideraciones técnicas:**
   - **Usar `papaparse` con streaming** para archivos grandes (no cargar todo en memoria)
   - **Insertar en batches de 500**, con `db.transaction` por batch
   - **Progress reporting**: actualizar `import_history.processed_rows` cada batch para UI en tiempo real
   - **Emails de invitación**: encolar en `notification_queue`, no enviar síncrono (o el import se vuelve lentísimo)
   - **Contraseñas iniciales**: generar random, no se guardan (usuario las setea al activar)

10. **Plantillas CSV:**
    - Cada una tiene headers exactos + 2 filas de ejemplo
    - Encoding UTF-8 con BOM (compatible con Excel)
    - Delimiter: coma (mejor compatibilidad)
    - Documentar cada columna en página de ayuda accesible desde la UI

11. **Al terminar:**
    - `pnpm typecheck && pnpm lint && pnpm test` pasa
    - Manual: importar los 6 tipos de entidad con archivos de ejemplo
    - Manual: subir CSV con errores → ver dry-run → descargar CSV de errores → corregir → re-subir
    - Manual: importar 5,000 estudiantes → verificar que termina en tiempo razonable (<2min)
    - Manual: verificar que los emails de invitación llegan (en queue)
    - Actualizar roadmap marcando Fase 6 completa
    - **Importante**: actualizar README del proyecto indicando que el MVP está completo

**Importante:**
- Esta es la última fase del MVP. Después de mergearla, el sistema está **listo para go-live**.
- Planeá las validaciones de cross-references con cuidado: verificar que los programas, cursos, etc. referenciados en el CSV existan antes de insertar.
- Si detectás deuda técnica importante, documentala en `TECH_DEBT.md` pero no la arregles aquí — el MVP está cerrado.

**Post-MVP (no en esta fase, solo referencia):**
- Import asíncrono con notificación de completion
- Rollback de un import completo (undo)
- Mapeo visual de columnas si headers no coinciden
- Integración directa con sistemas comunes (Google Sheets, software contable)

Arrancá leyendo y hacé las preguntas.
