# Prompt Fase 5 — Reportes y Hardening

> **Cómo usar:** crea branch `phase/5-reports` y pega este prompt.

---

## Prompt

Vamos con Fase 5: reportes, exports, UI de auditoría y **hardening para producción**. Fase 4 (Pagos) está mergeada.

Esta fase cierra el MVP. Al terminar, el sistema queda listo para piloto real con un tenant.

**Antes de codear:**

1. **Releé `CLAUDE.md`.**

2. **Leé estos archivos:**
   - `docs/phases/phase-5-reports-hardening.md`
   - `docs/specs/08-reports-and-exports.md`
   - `docs/specs/09-security-and-rls.md` completo — esta fase incluye el **pentest manual** y el checklist de hardening
   - `docs/specs/11-deployment-and-ops.md` (cabeceras, CSP, monitoring)

3. **Confirmá que tenés claro:**
   - Dashboard admin con KPIs agregados
   - Reportes específicos: ingresos, mora, rendimiento académico
   - Export genérico XLSX/CSV con **whitelist de columnas** (columnas sensibles excluidas)
   - UI de auditoría: feed + drill-down con diff visual
   - Checklist de hardening: RLS audit automático, cabeceras, CSP, rate limiting completo, Sentry
   - Pentest manual: intentos cruzados de acceso que deben fallar

4. **Preguntas antes de arrancar:**
   - ¿Materialized views para reportes pesados o queries directas? (recomiendo queries directas en MVP con <10k estudiantes)
   - Librería de gráficos: `recharts` (ya en stack potencial) o `chart.js`?
   - Sentry: ¿plan free o Team? (depende de volumen esperado)
   - ¿Agregar analytics de producto (Vercel Analytics) en esta fase? (recomiendo sí, es gratis y trivial)
   - Política de retención de CSVs importados: spec dice 90 días, ¿confirmamos?

5. **Proponé un plan con:**

   **Parte A — Reportes y UI:**
   - Migraciones SQL: 3 vistas agregadas + tabla `export_column_whitelist`
   - Server Actions para reportes y export
   - Dashboard admin con cards + gráficos
   - Páginas de reportes específicos
   - Export wizard con selección de columnas
   - UI de auditoría con drill-down

   **Parte B — Hardening:**
   - Script `scripts/audit-rls.ts` que verifica RLS en 100% de tablas
   - CI job que ejecuta ese script
   - Revisión completa de cabeceras de seguridad
   - Ajuste de CSP para producción (sin `unsafe-eval`)
   - Configuración Sentry (si no estaba)
   - Auditoría de rate limiting en todos los endpoints públicos
   - **Pentest manual**: lista de intentos a ejecutar y documentar
   - `docs/HARDENING_CHECKLIST.md` completado

6. **Esperá aprobación.**

7. Durante ejecución:
   - Parte A primero, Parte B al final (hardening requiere sistema completo)
   - Tests de export críticos:
     - Streaming con 10k filas no OOM
     - RLS respetado en export (admin tenant A no exporta filas tenant B)
     - Whitelist respetada (columnas sensibles excluidas aunque se pidan)
   - Pentest manual con checklist: ejecutar **cada** intento del spec 09 sección "Tests de seguridad obligatorios" y documentar resultado

8. **Hardening checklist (crítico):**

   Al cerrar la fase, **cada item debe estar verificado y marcado**:
   - [ ] `scripts/audit-rls.ts` corre en CI y pasa
   - [ ] Todas las tablas tienen `ENABLE ROW LEVEL SECURITY` y `FORCE ROW LEVEL SECURITY`
   - [ ] Todos los Server Actions validan con Zod + llaman `requireSession` + `requirePermission`
   - [ ] Cabeceras de seguridad en todas las respuestas (test con `curl -I`)
   - [ ] CSP sin `unsafe-eval`
   - [ ] Rate limiting en login, forgot-password, reset-password, activate, invite, export, pdf generation
   - [ ] Secretos rotables y solo en env vars (no hardcoded)
   - [ ] `pnpm audit` sin CVEs críticos
   - [ ] Sentry configurado y capturando errores
   - [ ] Pentest manual ejecutado: todos los intentos fallan como esperado
   - [ ] Documentación de usuario (breve, por rol) en `docs/user-guide/`
   - [ ] Runbook de incidentes en `docs/RUNBOOK.md`

9. **Pentest manual — cosas que DEBEN fallar:**
   - Como student: GET `/a/reports` → 403
   - Como student A: GET recibo de student B → 403 o 404
   - Como admin tenant A: export de datos tenant B → data vacía o 403
   - Como teacher: POST action de admin → ForbiddenError
   - Sin sesión: request a Server Action protegida → 401
   - Input con `' OR 1=1 --` en filtro → Zod rechaza o prepared statements lo manejan
   - Comentario con `<script>alert(1)</script>` → se escapa en display
   - 6to intento de login fallido → rate limit 429

   **Documentá el resultado de cada intento** en `HARDENING_CHECKLIST.md`.

10. **Al terminar:**
    - `pnpm typecheck && pnpm lint && pnpm test` pasa
    - `scripts/audit-rls.ts` pasa
    - `HARDENING_CHECKLIST.md` 100% marcado
    - Manual: probar dashboard admin con datos reales → KPIs correctos
    - Manual: export XLSX de 10k estudiantes → descarga OK sin OOM
    - Manual: UI de auditoría → ver historial de una nota → diff visual funciona
    - Manual: ejecutar pentest con los 8 intentos → todos fallan
    - Actualizar roadmap marcando Fase 5 completa
    - Preparar resumen del PR incluyendo **checklist de hardening completado**

**Importante:**
- Esta fase cierra el MVP. Después de mergearla, el sistema queda listo para un piloto real.
- Fase 6 (importación masiva) es el puente al go-live con data histórica, pero **técnicamente** el sistema ya funciona al final de Fase 5.
- Si durante el pentest encontrás alguna vulnerabilidad real (no esperada), detené todo y arreglala antes de merge.

Arrancá leyendo y hacé las preguntas.
