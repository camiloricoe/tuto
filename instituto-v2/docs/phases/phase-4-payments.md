# Fase 4 — Módulo de Pagos

**Objetivo**: admin/treasurer registra pagos manualmente; estudiantes ven estado de cuenta y descargan recibos; sistema envía recordatorios de mora; todo auditado.

**Branch**: `phase/4-payments`
**Duración estimada**: 3-4 días
**Specs a leer**: `/docs/specs/05-payments-module.md`, `/docs/specs/06-audit-and-logs.md`, `/docs/specs/07-notifications.md`

---

## Resultado esperado al final

1. Admin crea concepto "Matrícula 2026" y "Cuota Mensual"
2. Admin genera cargo de matrícula para 20 estudiantes
3. Admin recibe comprobante de transferencia de un estudiante
4. Admin entra a `/a/students/[id]/payments/new`
5. Ingresa monto, método, referencia, sube comprobante
6. Sistema sugiere allocation FIFO al cargo de matrícula
7. Admin confirma; se genera recibo PDF con número correlativo
8. Estudiante recibe notification + email + puede descargar recibo PDF
9. Estudiante entra a `/s/payments`, ve su estado de cuenta actualizado
10. Job diario detecta cargos vencidos y envía recordatorios
11. Admin puede anular pago con razón → queda en audit

---

## Migraciones SQL

### `YYYYMMDDHHMMSS_payment_concepts.sql`
- Tabla `payment_concepts`
- RLS

### `YYYYMMDDHHMMSS_student_charges.sql`
- Tabla `student_charges`
- Status enum: `pending | partial | paid | void`
- RLS

### `YYYYMMDDHHMMSS_student_charges_audit.sql`
- Tabla + trigger

### `YYYYMMDDHHMMSS_payments.sql`
- Tabla `payments`
- Method enum: `cash | transfer | check | other`
- Status enum: `confirmed | rejected | void`
- `external_transaction_id text NULL` — reservado para pasarela online futura
- RLS

### `YYYYMMDDHHMMSS_payments_audit.sql`
- Tabla + trigger

### `YYYYMMDDHHMMSS_payment_allocations.sql`
- Tabla `payment_allocations`
- FK a `payments` y `student_charges`
- Constraint: `amount_applied > 0`
- RLS

### `YYYYMMDDHHMMSS_receipts.sql`
- Tabla `receipts`
- UNIQUE `payment_id`
- `number text NOT NULL` — formato `YYYY-NNNNNN`
- RLS

### `YYYYMMDDHHMMSS_receipt_numbering.sql`

Función que genera el siguiente número de recibo de forma atómica por tenant y año:

```sql
CREATE OR REPLACE FUNCTION public.next_receipt_number(p_tenant_id uuid, p_year int)
RETURNS text AS $$
DECLARE
  v_seq_name text;
  v_next bigint;
BEGIN
  v_seq_name := format('receipts_seq_%s_%s',
    replace(p_tenant_id::text, '-', '_'),
    p_year
  );

  -- Crear secuencia si no existe (idempotente)
  EXECUTE format(
    'CREATE SEQUENCE IF NOT EXISTS %I MINVALUE 1 START 1',
    v_seq_name
  );

  EXECUTE format('SELECT nextval(%L)', v_seq_name) INTO v_next;

  RETURN format('%s-%s', p_year, lpad(v_next::text, 6, '0'));
END;
$$ LANGUAGE plpgsql;
```

Advertencia: PostgreSQL permite muchas secuencias pero si hay cientos de tenants, considerar alternativa — ver notas al final.

### `YYYYMMDDHHMMSS_account_statement_view.sql`

```sql
CREATE OR REPLACE VIEW v_student_account_statement AS
SELECT
  sc.student_id,
  sc.tenant_id,
  COALESCE(SUM(sc.amount) FILTER (WHERE sc.status IN ('pending','partial')), 0)
    - COALESCE(SUM(pa.amount_applied) FILTER (WHERE p.status = 'confirmed'), 0)
    AS balance_due,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'confirmed'), 0) AS total_paid,
  COUNT(DISTINCT sc.id) FILTER (WHERE sc.status = 'pending' AND sc.due_date < CURRENT_DATE)
    AS overdue_count,
  MIN(sc.due_date) FILTER (WHERE sc.status = 'pending')
    AS next_due_date
FROM student_charges sc
LEFT JOIN payment_allocations pa ON pa.charge_id = sc.id
LEFT JOIN payments p ON p.id = pa.payment_id
WHERE sc.deleted_at IS NULL
GROUP BY sc.student_id, sc.tenant_id;
```

### `YYYYMMDDHHMMSS_storage_buckets.sql`

Crear buckets de Storage:
- `payment-proofs` (privado, solo via signed URL)
- `receipts` (privado)

Con policies de RLS que respeten tenant isolation.

---

## Validadores Zod

`lib/validators/payments.ts`:
```ts
export const paymentConceptSchema = z.object({
  code: z.string().min(2).max(30),
  name: z.string().min(3).max(100),
  default_amount: z.number().nonnegative().multipleOf(0.01).optional().nullable(),
  recurring: z.boolean().default(false),
})

export const studentChargeSchema = z.object({
  student_id: z.string().uuid(),
  concept_id: z.string().uuid(),
  program_id: z.string().uuid().nullable().optional(),
  period_id: z.string().uuid().nullable().optional(),
  amount: z.number().positive().multipleOf(0.01),
  due_date: z.coerce.date(),
  notes: z.string().max(500).optional().nullable(),
})

export const paymentInputSchema = z.object({
  student_id: z.string().uuid(),
  amount: z.number().positive().multipleOf(0.01),
  method: z.enum(['cash','transfer','check','other']),
  reference: z.string().max(100).nullable().optional(),
  paid_on: z.coerce.date(),
  notes: z.string().max(1000).nullable().optional(),
  proof_file_key: z.string().nullable().optional(),  // key en Storage
  allocations: z.array(z.object({
    charge_id: z.string().uuid(),
    amount_applied: z.number().positive().multipleOf(0.01),
  })).min(1).max(50),
}).refine(
  d => d.allocations.reduce((s,a) => s + a.amount_applied, 0) <= d.amount + 0.001,
  { message: 'La suma de asignaciones no puede exceder el monto del pago' }
)

export const voidPaymentSchema = z.object({
  payment_id: z.string().uuid(),
  reason: z.string().min(20).max(500),
})
```

---

## Lógica de negocio

### `lib/payments/allocate.ts`

```ts
export function suggestAllocation(
  paymentAmount: number,
  pendingCharges: StudentCharge[]
): AllocationSuggestion[]
// FIFO por due_date, cubre charges hasta agotar monto
```

### `lib/payments/receipt-number.ts`

```ts
export async function generateReceiptNumber(
  tenantId: string,
  year: number,
  tx: Transaction
): Promise<string>
// Llama función SQL next_receipt_number
```

### `lib/payments/calculate-balance.ts`

```ts
export async function getStudentBalance(studentId: string): Promise<{
  totalCharged: number
  totalPaid: number
  balanceDue: number
  overdueCount: number
}>
```

---

## Server Actions

`app/actions/payments/`:

### `concepts.ts`
- `createPaymentConcept(input)` — perm `concepts:write`
- `updatePaymentConcept(id, input)`

### `charges.ts`
- `createCharge(input)` — perm `charges:write`
- `createChargeBatch(input)` — generar cargos a múltiples estudiantes (ej: matrícula a todo un programa)
- `voidCharge(id, reason)` — perm `charges:write`, razón obligatoria

### `payments.ts`

#### `recordPayment(input: PaymentInput)`
1. Auth + perm `payments:write`
2. Validar input con Zod
3. Validar que todos los charges existan, pertenezcan al student, y al tenant
4. **Transacción**:
   - Generar receipt_number
   - Insert payment (status = 'confirmed')
   - Insert allocations
   - Update charges.status según allocations (SQL query)
   - Insert receipt (con pdf_url temporal '')
5. Fuera de la transacción: renderizar PDF, subir a Storage
6. Update receipt.pdf_url
7. Crear notification + email para estudiante
8. `logActivity: payment.recorded`

#### `voidPayment(input)`
1. Auth + perm
2. Razón mínimo 20 chars
3. Transacción:
   - Update payment.status = 'void'
   - Para cada allocation: revertir → update charges.status
   - Update receipt.voided = true
4. Generar "recibo de anulación" PDF (opcional MVP)
5. Notification al estudiante
6. `logActivity: payment.voided` con reason

#### `uploadPaymentProof(file)`
- Server Action que sube a bucket `payment-proofs`
- Devuelve la key (se usa en `recordPayment`)
- Valida tipo (pdf, jpg, png) y tamaño (<5MB)

---

## Generación de PDF

### `lib/pdf/receipt.tsx`

Template con:
- Logo + datos del tenant
- "RECIBO #{number}" grande
- Fecha de emisión
- Datos del estudiante
- Tabla: concepto, período, monto
- Total
- Método + referencia
- Notas
- Pie: "Este recibo no constituye factura electrónica"

### `lib/pdf/render.ts`

```ts
export async function renderReceiptPdf(data: ReceiptData): Promise<Buffer>
export async function renderAccountStatementPdf(data: StatementData): Promise<Buffer>
```

---

## Rutas UI

### Portal Admin

#### `app/(admin)/a/payments/concepts/page.tsx`
CRUD de conceptos.

#### `app/(admin)/a/payments/page.tsx`
Lista de pagos recientes con filtros (fecha, método, estudiante). Paginado.

#### `app/(admin)/a/payments/[id]/page.tsx`
Detalle de un pago:
- Info general
- Allocations
- Link al recibo PDF
- Botón "Anular" (si no está anulado)
- Historial (activity_log + payment_audit)

#### `app/(admin)/a/students/[id]/account/page.tsx`
- Estado de cuenta completo del estudiante
- Lista de cargos (pending y pagados)
- Lista de pagos
- Botón "Registrar pago" + "Generar cargo"

#### `app/(admin)/a/students/[id]/payments/new/page.tsx`
Form grande con:
- Estudiante pre-seleccionado
- Dropdown de charges pendientes con checkboxes
- Monto, método, fecha, referencia, notas
- Upload de comprobante (drag & drop)
- Sugerencia de allocation automática FIFO (editable)
- Submit → redirect a detalle de payment con link al recibo

#### `app/(admin)/a/reports/overdue/page.tsx` (básico en esta fase, full en fase 5)
Lista de estudiantes con cargos vencidos.

### Portal Student

#### `app/(student)/s/payments/page.tsx`
Estado de cuenta del estudiante:
- Balance destacado
- Lista de cargos pendientes con días de mora
- Historial de pagos con links a recibos
- Botón "Descargar estado de cuenta PDF"

#### Route handlers para descarga
- `/s/payments/receipts/[id]/route.ts` → devuelve PDF del recibo (con verificación RLS)
- `/s/payments/statement/route.ts` → genera estado de cuenta on-demand

---

## Job de recordatorios de mora

### `/api/cron/send-due-reminders/route.ts`

Corre diariamente 9am:
1. Query: charges con status='pending' y due_date <= today
2. Para cada uno calcular días de mora
3. Determinar si aplica notificación según reglas:
   - Día 1, 5, 15 → estudiante
   - Día 30+ → una sola notificación semanal agregada al admin
4. Chequear cooldown (24h) con tabla `notification_cooldowns` o column en charges
5. Enqueue notifications

### `/api/cron/overdue-admin-digest/route.ts`

Corre semanalmente lunes 8am:
1. Query: count de charges con mora >30 días por tenant
2. Email a cada admin/treasurer del tenant con resumen

---

## Tests

### Unit
- `tests/unit/payments/suggest-allocation.test.ts`: FIFO correcto, no excede monto
- `tests/unit/payments/calculate-balance.test.ts`: casos complejos
- `tests/unit/payments/validate-payment-input.test.ts`

### Integration
- `tests/integration/actions/record-payment-flow.test.ts`: transacción completa
- `tests/integration/actions/void-payment.test.ts`: reversa allocations
- `tests/integration/payments/receipt-numbering-concurrency.test.ts`: **crítico** — 10 inserts paralelos generan 10 números únicos
- `tests/integration/payments/receipt-numbering-no-gaps.test.ts`
- `tests/integration/rls/payments-student-only-own.test.ts`
- `tests/integration/rls/payments-treasurer-access.test.ts`
- `tests/integration/audit/payments-audit-trigger.test.ts`
- `tests/integration/notifications/overdue-reminders-cooldown.test.ts`

### E2E
- `tests/e2e/admin-records-payment.spec.ts`: flujo completo
- `tests/e2e/student-sees-account-statement.spec.ts`
- `tests/e2e/student-downloads-receipt.spec.ts`
- `tests/e2e/admin-voids-payment.spec.ts`

---

## Criterios de done

### Funcionales
- [ ] Admin registra pago exitoso con allocations → genera recibo
- [ ] Recibo PDF tiene número correlativo
- [ ] Numeración no tiene huecos (verificable)
- [ ] 10 pagos concurrentes → 10 números únicos
- [ ] Estudiante ve estado de cuenta correcto
- [ ] Estudiante descarga recibo propio
- [ ] Estudiante **no** puede descargar recibo ajeno
- [ ] Anulación de pago revierte allocations
- [ ] Anulación requiere razón ≥20 chars
- [ ] Job diario envía recordatorios respetando cooldown
- [ ] Comprobante (archivo) se sube a Storage con RLS

### Técnicos
- [ ] `pnpm typecheck && pnpm lint && pnpm test` pasa
- [ ] Cobertura `lib/payments/*` > 90%
- [ ] RLS tests pasan
- [ ] Tests de concurrencia de numeración pasan

---

## Deuda técnica esperable

- **Alternativa a secuencias por tenant**: si crece mucho, migrar a tabla `receipt_counters` con update atómico. Documentar en TECH_DEBT para considerar en fase 5.
- UI de "pagos a favor" (sobrantes): no MVP, pero pensar en el modelo
- Reversa parcial de pagos: no MVP (solo anulación total)
- Integración con software contable: no MVP, placeholder en notas de payment
- Multi-moneda: columna `currency` existe, pero UI solo maneja COP

---

## Consideraciones de producción

- **Storage**: monitorear crecimiento de `payment-proofs`. Policy de lifecycle (archivar a cold storage después de 2 años).
- **PDFs**: si la generación on-demand es lenta para estados de cuenta largos, considerar caching + invalidación en payment write.
- **Numeración**: escribir test de stress que genere 1000 recibos concurrentes y verifique numeración.
