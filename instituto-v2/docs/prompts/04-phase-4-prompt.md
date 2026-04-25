# Prompt Fase 4 — Módulo de Pagos

> **Cómo usar:** crea branch `phase/4-payments` y pega este prompt.

---

## Prompt

Vamos con Fase 4: módulo de pagos. Fase 3 (Notas) está mergeada.

**Antes de codear:**

1. **Releé `CLAUDE.md`.**

2. **Leé estos archivos:**
   - `docs/phases/phase-4-payments.md`
   - `docs/specs/05-payments-module.md`
   - `docs/specs/06-audit-and-logs.md` (aplicar trigger genérico a payments)
   - `docs/specs/07-notifications.md` (notifs de pago + recordatorios de mora)
   - `docs/specs/09-security-and-rls.md` (RLS para payments, charges, receipts)

3. **Confirmá que tenés claro:**
   - **No hay pasarela online en MVP**: admin registra pagos manualmente
   - Modelo preparado para pasarela futura (`external_transaction_id` ya está)
   - Un pago puede cubrir múltiples cargos (many-to-many via `payment_allocations`)
   - **Numeración de recibos**: correlativa por (tenant, año), sin huecos, `YYYY-NNNNNN`
   - **Anulación**: soft (status='void'), no borra, queda en audit. Número no se reutiliza.
   - Estado de cuenta vía vista `v_student_account_statement`
   - Mora: notificaciones en día 1, 5, 15; admin digest semanal para mora >30 días
   - **No bloqueos automáticos** por mora en MVP — solo notifs

4. **Preguntas antes de arrancar:**
   - Moneda default: COP confirmamos?
   - Ventana permitida de `paid_on`: ¿futuro permitido o solo fecha actual/pasada? (recomiendo solo hoy o pasado)
   - ¿Generar PDF de "recibo de anulación" al anular o solo marcar voided? (recomiendo solo marcar, simplifica)
   - Monto máximo de pago único (para sanity check): ¿$50M COP? ¿Sin límite?
   - ¿Permitir pagos "a favor" (saldo sobrante del estudiante)? Spec dice NO en MVP — confirmamos?

5. **Proponé un plan con:**
   - Migraciones SQL en orden exacto (8-9 archivos)
   - **Función crítica**: `next_receipt_number(tenant_id, year)` — detallá cómo manejás la secuencia (ver spec)
   - Vista `v_student_account_statement`
   - Buckets Storage: `payment-proofs`, `receipts` con RLS
   - Lógica de negocio en `lib/payments/`: suggestAllocation (FIFO), calculateBalance
   - Server Actions: `recordPayment`, `voidPayment`, `createCharge`, `uploadPaymentProof`
   - Template PDF de recibo (`lib/pdf/receipt.tsx`)
   - Cron jobs: `send-due-reminders` (daily 9am), `overdue-admin-digest` (weekly mon 8am)
   - UI admin: registro de pago, estado de cuenta del estudiante
   - UI estudiante: `/s/payments` con estado de cuenta y descarga de recibos
   - Tests críticos (ver lista abajo)

6. **Esperá aprobación.**

7. **Tests no negociables en esta fase:**
   - Numeración correlativa con **concurrencia**: escribir test que genere 10 pagos en paralelo y verifique 10 números únicos sin huecos
   - Allocations no exceden monto del pago
   - Anulación revierte allocations correctamente y recalcula status de charges
   - Receipt voided mantiene el número (no se reutiliza)
   - Estudiante solo lee sus pagos (RLS)
   - Treasurer puede escribir pagos pero no escribir notas (permisos)
   - Audit trigger en payments y student_charges funciona
   - Recordatorio de mora respeta cooldown de 24h (no envía dos veces)
   - Generación de PDF no falla con caracteres especiales (ñ, tildes)

8. **UI crítica:**
   - Form de registro de pago debe ser eficiente para admin (atajos de teclado, suggestion de allocation FIFO, submit rápido)
   - Estado de cuenta del estudiante claro: saldo grande arriba, cargos pendientes destacados, mora en rojo
   - Descarga de recibo validada por RLS en el route handler

9. **Transacciones:**
   - `recordPayment` es una transacción Postgres completa: payment + allocations + update charges + receipt. Si algo falla, rollback total.
   - Generar el PDF **fuera** de la transacción (operación IO pesada). Si falla solo el PDF, el payment queda con `receipt.pdf_url = ''` y un job retry lo genera.

10. **Al terminar:**
    - `pnpm typecheck && pnpm lint && pnpm test` pasa
    - Cobertura `lib/payments/*` > 90%
    - Manual: registrar un pago completo → verificar que el recibo PDF se genera y descarga correctamente
    - Manual: anular el pago → verificar que el estado de cuenta se recalcula
    - Manual: ejecutar cron de mora manualmente con datos test → verificar que llegan recordatorios
    - Actualizar roadmap

**Importante:**
- No implementes reportes ni exports todavía (Fase 5).
- Si el PDF te da problemas con fonts custom, usá las fonts built-in de `@react-pdf/renderer`.
- **Precisión monetaria**: usá `numeric(12,2)` en BD y nunca operes con `float` en JS. Considerá librería como `dinero.js` o manejalo con enteros (centavos) y conviertas solo para display.

Arrancá leyendo y hacé las preguntas.
