import { z } from 'zod/v4'

export const createCurriculumSchema = z.object({
  programId: z.string().uuid('ID de programa invalido'),
  name: z.string().min(2, 'Nombre requerido'),
  version: z.string().min(1).optional().default('1'),
  cycles: z
    .number()
    .int('Ciclos debe ser entero')
    .min(1, 'Minimo 1 ciclo')
    .max(20, 'Maximo 20 ciclos'),
  notes: z.string().optional(),
})

export const updateCurriculumSchema = z.object({
  name: z.string().min(2, 'Nombre requerido').optional(),
  version: z.string().min(1).optional(),
  cycles: z
    .number()
    .int('Ciclos debe ser entero')
    .min(1, 'Minimo 1 ciclo')
    .max(20, 'Maximo 20 ciclos')
    .optional(),
  notes: z.string().optional(),
})

export const addCurriculumSubjectSchema = z.object({
  curriculumId: z.string().uuid('ID de pensum invalido'),
  subjectId: z.string().uuid('ID de materia invalido'),
  cycle: z.number().int().min(1, 'Ciclo invalido'),
  credits: z.number().positive('Creditos debe ser positivo').optional(),
  isRequired: z.boolean().optional().default(true),
  sequence: z.number().int().optional(),
})

export const updateCurriculumSubjectSchema = z.object({
  id: z.string().uuid('ID invalido'),
  cycle: z.number().int().min(1, 'Ciclo invalido').optional(),
  credits: z.number().positive('Creditos debe ser positivo').optional(),
  isRequired: z.boolean().optional(),
  sequence: z.number().int().optional(),
})

export type CreateCurriculumInput = z.infer<typeof createCurriculumSchema>
export type UpdateCurriculumInput = z.infer<typeof updateCurriculumSchema>
export type AddCurriculumSubjectInput = z.infer<typeof addCurriculumSubjectSchema>
export type UpdateCurriculumSubjectInput = z.infer<typeof updateCurriculumSubjectSchema>
