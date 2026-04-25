# Spec 05 — Pagos y Recibos

## Alcance del MVP

- **Registro manual de pagos por admin/treasurer**.
- Recibos PDF con numeración interna (no DIAN).
- Notificaciones por mora, sin bloqueos automáticos.
- Modelo preparado para integrar pasarela online en Fase 2 sin rewrites.

---

## Conceptos

### Payment concept
Catálogo de "qué se cobra". Ejemplos:
- Matrícula anual
- Cuota mensual
- Inscripción por materia
- Derecho de grado

Cada concepto puede tener monto default. Si es `recurring`, se usa para generar cargos automáticos (p.ej. mensualidades).

### Student charge
Un **cargo** es una obligación de pago del estudiante. Se crea:
- Manualmente por admin (ej: matrícula 2026).
- Automáticamente al inicio de un período si hay cargos recurrentes configurados (Fase 2).
- Al enrolar a un estudiante si el programa lo requiere (Fase 2).

Un charge tiene:
- `amount`: cuánto debe
- `due_date`: cuándo vence
- `status`: `pending` | `partial` | `paid` | `void`

### Payment
Un **pago** es dinero que el estudiante entregó al instituto. Puede cubrir uno o varios charges.

### Payment allocation
El vínculo many-to-many entre pagos y cargos:
```
Payment de $1.500.000
├── Allocation a Charge "Matrícula": $1.000.000
└── Allocation a Charge "Cuota Enero": $500.000
```

Un mismo charge puede tener múltiples allocations (pagos parciales).

### Receipt
Un recibo PDF asociado a un payment. Se genera al registrar el pago y queda en Supabase Storage.

---

## Flujo: admin registra un pago

### Pantalla `/a/students/[id]/payments/new`

1. Admin selecciona estudiante (o viene pre-seleccionado).
2. Sistema muestra cargos pendientes del estudiante con botones "pagar total / pagar parcial / ignorar".
3. Admin define:
   - Monto total del pago
   - Método (efectivo / transferencia / cheque / otro)
   - Fecha del pago
   - Referencia (número de consignación, último 4 de cheque, etc.)
   - Sube comprobante (opcional, a `payment-proofs/` bucket)
   - Notas
4. Admin asigna el monto a cargos (allocations).
   - Sistema sugiere asignación automática FIFO por `due_date`.
   - Admin puede modificar.
5. Validaciones:
   - Σ(allocations) ≤ payment.amount
   - Sobrante queda como "a favor" (no implementado en MVP; por ahora, no debe haber sobrante: si hay, error).
6. Al guardar (transacción):
   - Insert en `payments` con `status = 'confirmed'`.
   - Insert en `payment_allocations`.
   - Update de `student_charges.status` según si queda saldo o no.
   - Generación de recibo PDF.
   - Insert en `receipts` con número correlativo por tenant (ej: `2026-000123`).
   - Upload del PDF a Storage.
   - Insert en `activity_log`: `payment.recorded`.
   - Trigger dispara `payments_audit`.
   - Notificación email + in-app al estudiante.

### Numeración de recibos
- Correlativa por tenant y año.
- Generada con `SELECT nextval('receipts_seq_<tenant>_<year>')` — función de Postgres que crea secuencias por tenant-year on-demand.
- Formato: `YYYY-NNNNNN` (6 dígitos con padding).
- **Nunca** hay huecos en la numeración dentro de un año. Si se anula un recibo, se marca `voided` pero el número no se reutiliza.

---

## Flujo: anular un pago

Rol: `admin` o `super_admin`. Requiere razón obligatoria.

1. Admin entra a `/a/payments/[id]` → botón "Anular".
2. Ingresa razón (mínimo 20 caracteres).
3. Sistema:
   - Cambia `payments.status` a `void`.
   - Revierte las `payment_allocations` (soft — se marcan, no se borran).
   - Recalcula `student_charges.status`.
   - Marca el receipt como `voided` (pero el número no se reutiliza).
   - Genera "Recibo de anulación" PDF complementario.
   - Activity log: `payment.voided` con razón.
   - Notifica al estudiante.

---

## Estado de cuenta del estudiante

### `/s/payments` — vista del estudiante
- **Saldo actual**: Σ charges pending - Σ payments aplicados.
- **Cargos pendientes**: lista con monto, vencimiento, días de mora.
- **Historial de pagos**: fecha, monto, método, link para descargar recibo PDF.
- **Descargar estado de cuenta PDF**: botón que genera un PDF consolidado.

### `/a/students/[id]/account` — vista admin
Mismo estado de cuenta, más:
- Botón "Registrar pago"
- Botón "Generar cargo manual"
- Timeline de actividad financiera

---

## Mora y notificaciones

**Sin bloqueos en MVP**, solo notificaciones.

Job diario (cron via Vercel Cron o Supabase Scheduled Functions):
1. Busca charges con `status = 'pending'` y `due_date < today`.
2. Marca dias de mora = `today - due_date`.
3. Envía notificación según regla:
   - Día 1 de mora: email + in-app "Tu pago de [concepto] está vencido desde ayer".
   - Día 5: recordatorio.
   - Día 15: recordatorio.
   - Día 30: notificación a admin/treasurer: "[N] estudiantes con mora >30 días".
4. No envía la misma notificación más de una vez (tabla `notification_cooldowns` o flag en `notifications`).

---

## Recibo PDF

### Contenido
- Logo del tenant
- Datos del tenant (nombre, NIT, dirección, teléfono)
- Número de recibo (grande y visible)
- Fecha de emisión
- Datos del estudiante (nombre, documento, programa)
- Detalle: lista de allocations con concepto, período asociado, monto
- Total
- Método de pago
- Referencia
- Texto al pie: "Este recibo no constituye factura electrónica" (MVP sin DIAN)
- Firma digital opcional (imagen en settings del tenant)

### Template
`/lib/pdf/receipt-template.tsx` usando `@react-pdf/renderer`.
Recibe un prop tipado; renderiza componentes de `@react-pdf/renderer`.

---

## Validaciones

```ts
// lib/validators/payments.ts
export const paymentInputSchema = z.object({
  student_id: z.string().uuid(),
  amount: z.number().positive().multipleOf(0.01),
  method: z.enum(['cash','transfer','check','other']),
  reference: z.string().max(100).nullable().optional(),
  paid_on: z.coerce.date(),
  notes: z.string().max(1000).nullable().optional(),
  allocations: z.array(z.object({
    charge_id: z.string().uuid(),
    amount_applied: z.number().positive().multipleOf(0.01),
  })).min(1),
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

## Tests críticos

1. Registrar pago con allocations válidas → estado de cuenta se actualiza correctamente.
2. Registrar pago que excede allocations → error.
3. Anular pago → charges vuelven a `pending`, receipt marcado `voided`, número no se reutiliza.
4. Numeración correlativa: crear 10 pagos en paralelo → ningún número duplicado, ningún hueco.
5. Un estudiante solo puede leer sus propios pagos (RLS).
6. Un treasurer puede registrar pagos pero no editar notas.
7. Estado de cuenta: deuda = Σ pending - Σ paid. Cálculo correcto con pagos parciales.
8. PDF se genera y se sube a Storage exitosamente.
