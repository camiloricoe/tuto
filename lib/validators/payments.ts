import { z } from 'zod/v4'

export const createPaymentConceptSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  code: z
    .string()
    .min(2, 'Codigo requerido')
    .regex(/^[A-Z0-9_-]+$/, 'Solo mayusculas, numeros y guiones'),
  defaultAmount: z.number().min(0, 'El monto no puede ser negativo').optional(),
  recurring: z.boolean().optional(),
})

export const updatePaymentConceptSchema = createPaymentConceptSchema.partial()

export const createChargeSchema = z.object({
  studentId: z.string().uuid('ID de estudiante invalido'),
  conceptId: z.string().uuid('ID de concepto invalido'),
  amount: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha invalida (YYYY-MM-DD)'),
  periodId: z.string().uuid().optional(),
  programId: z.string().uuid().optional(),
  notes: z.string().optional(),
})

export const recordPaymentSchema = z.object({
  studentId: z.string().uuid('ID de estudiante invalido'),
  amount: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  method: z.enum(['cash', 'transfer', 'card', 'check', 'other'], {
    error: 'Metodo de pago invalido',
  }),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha invalida (YYYY-MM-DD)'),
  reference: z.string().optional(),
  notes: z.string().optional(),
  externalTransactionId: z.string().optional(),
})

export const voidPaymentSchema = z.object({
  paymentId: z.string().uuid('ID de pago invalido'),
  reason: z.string().min(5, 'Razon requerida (minimo 5 caracteres)'),
})

export type CreatePaymentConceptInput = z.infer<typeof createPaymentConceptSchema>
export type UpdatePaymentConceptInput = z.infer<typeof updatePaymentConceptSchema>
export type CreateChargeInput = z.infer<typeof createChargeSchema>
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>
export type VoidPaymentInput = z.infer<typeof voidPaymentSchema>
