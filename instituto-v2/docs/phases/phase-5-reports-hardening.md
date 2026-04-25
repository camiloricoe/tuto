# Fase 5 — Reportes y Hardening

**Objetivo**: admin tiene dashboards con KPIs agregados, puede exportar cualquier entidad a XLSX/CSV, consultar auditoría, y el sistema está endurecido para producción real.

**Branch**: `phase/5-reports`
**Duración estimada**: 2-3 días
**Specs a leer**: `/docs/specs/08-reports-and-exports.md`, `/docs/specs/09-security-and-rls.md`

---

## Resultado esperado al final

1. Admin entra a `/a/reports` y ve dashboard con cards: ingresos del mes, cuentas por cobrar, promedio por programa, cursos activos
2. Admin genera reporte detallado de ingresos del último trimestre con breakdown por método de pago
3. Admin exporta lista de estudiantes a XLSX con filtros aplicados
4. Admin exporta histórico de pagos a CSV
5. Admin consulta `/a/audit`: ve feed de actividad reciente del tenant, puede filtrar por usuario/acción/fecha
6. Admin hace drill-down en un registro → ve historial completo de cambios (diff visual)
7. Sistema pasa checklist de hardening: RLS auditable, cabeceras, CSP, Sentry activo, rate limiting en todos los endpoints públicos

---

## Migraciones SQL

### `YYYYMMDDHHMMSS_income_summary_view.sql`

```sql
CREATE OR REPLACE VIEW v_admin_income_summary AS
SELECT
  p.tenant_id,
  date_trunc('month', p.paid_on) AS month,
  p.method,
  pc.code AS concept_code,
  pc.name AS concept_name,
  COUNT(DISTINCT p.id) AS payment_count,
  SUM(pa.amount_applied) AS total_applied,
  SUM(p.amount) FILTER (WHERE p.status = 'confirmed') AS total_confirmed
FROM payments p
JOIN payment_allocations pa ON pa.payment_id = p.id
JOIN student_charges sc ON sc.id = pa.charge_id
JOIN payment_concepts pc ON pc.id = sc.concept_id
WHERE p.status = 'confirmed'
GROUP BY p.tenant_id, date_trunc('month', p.paid_on), p.method, pc.code, pc.name;
```

### `YYYYMMDDHHMMSS_overdue_view.sql`

```sql
CREATE OR REPLACE VIEW v_overdue_charges AS
SELECT
  sc.tenant_id,
  sc.student_id,
  sc.id AS charge_id,
  sc.amount,
  sc.due_date,
  CURRENT_DATE - sc.due_date AS days_overdue,
  COALESCE(SUM(pa.amount_applied), 0) AS amount_paid,
  sc.amount - COALESCE(SUM(pa.amount_applied), 0) AS balance_due,
  up.full_name AS student_name,
  (SELECT MAX(p.paid_on) FROM payments p
   WHERE p.student_id = sc.student_id AND p.status = 'confirmed') AS last_payment_date
FROM student_charges sc
JOIN user_profiles up ON up.id = sc.student_id
LEFT JOIN payment_allocations pa ON pa.charge_id = sc.id
LEFT JOIN payments p ON p.id = pa.payment_id AND p.status = 'confirmed'
WHERE sc.status IN ('pending', 'partial')
  AND sc.due_date < CURRENT_DATE
  AND sc.deleted_at IS NULL
GROUP BY sc.tenant_id, sc.student_id, sc.id, sc.amount, sc.due_date, up.full_name;
```

### `YYYYMMDDHHMMSS_academic_performance_view.sql`

```sql
CREATE OR REPLACE VIEW v_course_performance AS
SELECT
  c.tenant_id,
  c.id AS course_id,
  s.code AS subject_code,
  s.name AS subject_name,
  ap.code AS period_code,
  COUNT(DISTINCT e.id) AS enrollments_count,
  COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'completed') AS completed_count,
  AVG(e.final_grade) FILTER (WHERE e.final_grade IS NOT NULL) AS avg_final_grade,
  COUNT(DISTINCT e.id) FILTER (
    WHERE e.final_grade >= gs.passing_grade
  ) AS passed_count
FROM courses c
JOIN subjects s ON s.id = c.subject_id
JOIN academic_periods ap ON ap.id = c.period_id
JOIN grading_schemes gs ON gs.id = c.grading_scheme_id
LEFT JOIN enrollments e ON e.course_id = c.id
WHERE c.deleted_at IS NULL
GROUP BY c.tenant_id, c.id, s.code, s.name, ap.code, gs.passing_grade;
```

### `YYYYMMDDHHMMSS_export_whitelist.sql`

Tabla que define qué columnas son exportables por entidad (whitelist para evitar fugas):

```sql
CREATE TABLE export_column_whitelist (
  entity text NOT NULL,
  column_name text NOT NULL,
  display_name text NOT NULL,
  is_default boolean DEFAULT true,
  PRIMARY KEY (entity, column_name)
);

-- Seed: columnas exportables por entidad
INSERT INTO export_column_whitelist (entity, column_name, display_name, is_default) VALUES
  ('students', 'full_name', 'Nombre completo', true),
  ('students', 'document_number', 'Documento', true),
  ('students', 'email', 'Email', true),
  ('students', 'phone', 'Teléfono', false),
  ('payments', 'paid_on', 'Fecha de pago', true),
  ('payments', 'amount', 'Monto', true),
  ('payments', 'method', 'Método', true),
  ('payments', 'reference', 'Referencia', false),
  -- ... etc para cada entidad
;
```

---

## Validadores Zod

`lib/validators/reports.ts`:

```ts
export const incomeReportFilterSchema = z.object({
  from_date: z.coerce.date(),
  to_date: z.coerce.date(),
  method: z.enum(['cash','transfer','check','other']).optional(),
  concept_id: z.string().uuid().optional(),
  program_id: z.string().uuid().optional(),
}).refine(d => d.to_date >= d.from_date, {
  message: 'to_date debe ser >= from_date',
})

export const overdueFilterSchema = z.object({
  days_min: z.number().int().min(0).default(1),
  days_max: z.number().int().max(365).optional(),
  program_id: z.string().uuid().optional(),
})

export const exportRequestSchema = z.object({
  entity: z.enum(['students','teachers','enrollments','payments','charges','grades','activity_log']),
  columns: z.array(z.string()).min(1).max(30),
  filters: z.record(z.unknown()).optional(),
  format: z.enum(['xlsx','csv']),
}).refine(/* validar que columns esté en whitelist */)
```

---

## Server Actions

`app/actions/reports/`:

### `dashboard.ts`
- `getDashboardKPIs(tenantId)` — totales del mes actual, comparación mes anterior

### `income.ts`
- `getIncomeReport(filters)` — agregaciones según filtros

### `overdue.ts`
- `getOverdueReport(filters)`

### `academic.ts`
- `getCoursePerformance(filters)`

### `export.ts`
- `generateExport(input: ExportRequest)` — devuelve stream del archivo
  - Valida permiso `reports:export`
  - Valida columnas contra whitelist
  - Query paginada (max 50,000 filas)
  - Streaming XLSX con `exceljs.stream` o CSV manual
  - `logActivity: export.generated` con entity, columns, rowCount

---

## Rutas UI

### Portal Admin

#### `app/(admin)/a/reports/page.tsx` — Dashboard
Cards con:
- Ingresos del mes actual (vs mes anterior)
- Cuentas por cobrar (total + count)
- Promedio general por programa (barras)
- Cursos activos / cerrados
- Próximas evaluaciones (calendario mini)

Usar `recharts` para gráficos.

#### `app/(admin)/a/reports/income/page.tsx`
- Filtros (rango fechas, método, concepto)
- Tabla de detalle
- Botón "Exportar XLSX"
- Gráfico de barras por mes

#### `app/(admin)/a/reports/overdue/page.tsx`
- Filtros (días de mora, programa)
- Tabla: estudiante, monto en mora, días, último pago
- Botón "Exportar"
- Botón "Enviar recordatorios" (bulk)

#### `app/(admin)/a/reports/academic-performance/page.tsx`
- Filtros (programa, período)
- Tabla de cursos con promedio, aprobados, tasa
- Click en curso → drill-down

#### `app/(admin)/a/export/page.tsx` — Export genérico
- Wizard:
  1. Seleccionar entidad
  2. Seleccionar columnas (checkbox list basada en whitelist)
  3. Filtros
  4. Formato (XLSX / CSV)
  5. Descargar

#### `app/(admin)/a/audit/page.tsx`
- Feed de activity_log paginado
- Filtros: usuario actor, action_code, rango fechas
- Click en entry → detalle con metadata

#### `app/(admin)/a/audit/record/[table]/[id]/page.tsx`
- Historial de una fila específica
- Lista cronológica de cambios
- Diff visual entre `old_data` y `new_data` (usar `diff` library)

#### `app/(admin)/a/audit/auth/page.tsx`
- Feed de `auth_events` para detectar patrones sospechosos
- Filtros: email, tipo de evento, IP

---

## Hardening checklist (implementación)

Esta fase también cierra el loop de seguridad. Crear archivo `docs/HARDENING_CHECKLIST.md` y completar:

### Verificación automática

Crear script `scripts/audit-rls.ts`:
```ts
// Verifica que TODAS las tablas de dominio tengan RLS habilitado
// Falla si encuentra tabla sin RLS
```

Ejecutar en CI como parte del test suite.

### Cabeceras de seguridad

Verificar en `middleware.ts` que están aplicadas:
- `Strict-Transport-Security`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`
- `Content-Security-Policy`

Test manual con `curl -I` contra preview deployment.

### Content Security Policy

Ajustar CSP para que sea lo más restrictiva posible:
```
default-src 'self';
script-src 'self' 'nonce-{random}';
style-src 'self' 'unsafe-inline';  -- Tailwind requiere
img-src 'self' data: https://*.supabase.co;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

### Sentry setup

Si no se configuró en Fase 0:
- `@sentry/nextjs` wizard: `pnpm dlx @sentry/wizard@latest -i nextjs`
- Source maps upload en build
- Ignorar errores esperados (UnauthorizedError, ForbiddenError, etc.)
- Alertas de Slack para errores P1

### Rate limiting completo

Auditar que todos los endpoints públicos tengan rate limit:
- `/api/auth/*` ✓ (fase 1)
- `/api/cron/*` ✓ (protegidos con CRON_SECRET)
- `/api/export/*` — agregar 10/hora por user
- PDF generation routes — 30/hora por user
- Login/forgot/reset ✓

### Pentest básico manual

Antes de cerrar fase 5, ejecutar estos intentos manuales:

1. **Tenant crossing**: con credenciales de tenant A, intentar acceder a URLs con IDs de tenant B. Debe fallar con 403 o devolver data vacía (RLS).
2. **Privilege escalation**: como student, intentar:
   - GET `/a/*` → 403
   - Llamar Server Actions de admin vía fetch → `ForbiddenError`
3. **IDOR**: como student A, intentar descargar recibo de student B → 403
4. **SQL injection**: probar inputs con `' OR 1=1 --` en filtros → Zod + prepared statements lo previenen
5. **XSS**: crear comentario en nota con `<script>alert(1)</script>` → debe escaparse
6. **CSRF**: Server Actions de Next.js tienen CSRF built-in, verificar
7. **Session hijacking**: cookie httpOnly + sameSite=lax
8. **Rate limit bypass**: probar con múltiples IPs simuladas

Documentar hallazgos en `HARDENING_CHECKLIST.md`.

---

## Tests

### Unit
- `tests/unit/reports/aggregations.test.ts`
- `tests/unit/export/column-whitelist.test.ts`
- `tests/unit/export/csv-encoding.test.ts`

### Integration
- `tests/integration/reports/income-report-query.test.ts`
- `tests/integration/reports/overdue-calculation.test.ts`
- `tests/integration/export/generate-xlsx.test.ts` — verifica streaming, no OOM con 10k filas
- `tests/integration/export/respects-rls.test.ts` — admin de tenant A exporta, no aparecen filas de tenant B
- `tests/integration/export/respects-whitelist.test.ts` — pedir columna no whitelisted → error
- `tests/integration/audit/audit-ui-query.test.ts`

### E2E
- `tests/e2e/admin-dashboard.spec.ts`: KPIs cargan
- `tests/e2e/admin-exports-xlsx.spec.ts`
- `tests/e2e/admin-views-audit-history.spec.ts`
- `tests/e2e/security-headers.spec.ts` — verifica cabeceras con HEAD requests

---

## Criterios de done

### Funcionales
- [ ] Dashboard admin carga con KPIs correctos
- [ ] Los 3 reportes agregados funcionan con data real
- [ ] Export XLSX de cada entidad funciona
- [ ] Export CSV funciona
- [ ] Export con 10,000 filas no excede memoria
- [ ] UI de auditoría muestra activity log + drill-down con diff
- [ ] Feed de auth_events funciona

### Hardening
- [ ] `scripts/audit-rls.ts` pasa: 100% tablas con RLS
- [ ] Cabeceras de seguridad en todas las respuestas
- [ ] CSP sin `unsafe-eval`
- [ ] Sentry configurado y capturando errores
- [ ] Rate limiting verificado en todos los endpoints públicos
- [ ] Pentest manual completado y documentado
- [ ] `pnpm audit` sin CVEs críticos

### Técnicos
- [ ] `pnpm typecheck && pnpm lint && pnpm test` pasa
- [ ] Cobertura en módulos críticos mantiene umbrales
- [ ] Columnas sensibles excluidas de exports

---

## Deuda técnica esperable

- Materialized views para reportes muy pesados: no MVP, considerar si hay >10k estudiantes
- Export asíncrono con notificación cuando está listo: no MVP, solo síncrono <50k filas
- Dashboard configurable por usuario: no MVP, layout fijo
- Más tipos de gráficos: solo bar y line en MVP
- Drill-down más profundo: MVP funcional, refinable
