import { z } from 'zod/v4'

export const createGroupSchema = z.object({
  programId: z.string().uuid('ID de programa invalido'),
  name: z.string().min(2, 'Nombre requerido'),
  code: z.string().optional(),
  intakeYear: z
    .number()
    .int('Anio debe ser entero')
    .min(2000, 'Anio invalido')
    .max(2100, 'Anio invalido'),
  intakePeriod: z.string().optional(),
  currentCycle: z.number().int().min(1, 'Ciclo invalido').optional().default(1),
  notes: z.string().optional(),
  curriculumId: z.string().uuid('ID de pensum invalido').optional(),
})

export const updateGroupSchema = z.object({
  name: z.string().min(2, 'Nombre requerido').optional(),
  code: z.string().optional(),
  intakePeriod: z.string().optional(),
  status: z
    .enum(['active', 'graduated', 'archived'], { error: 'Estado invalido' })
    .optional(),
  currentCycle: z.number().int().min(1, 'Ciclo invalido').optional(),
  notes: z.string().optional(),
})

export const addGroupMemberSchema = z.object({
  groupId: z.string().uuid('ID de grupo invalido'),
  studentId: z.string().uuid('ID de estudiante invalido'),
})

export const updateGroupSubjectSchema = z.object({
  id: z.string().uuid('ID invalido'),
  cycle: z.number().int().min(1, 'Ciclo invalido').optional(),
  credits: z.number().positive('Creditos debe ser positivo').optional(),
  isRequired: z.boolean().optional(),
  sequence: z.number().int().optional(),
  status: z
    .enum(['planned', 'in_progress', 'completed', 'skipped'], { error: 'Estado invalido' })
    .optional(),
})

export type CreateGroupInput = z.infer<typeof createGroupSchema>
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>
export type AddGroupMemberInput = z.infer<typeof addGroupMemberSchema>
export type UpdateGroupSubjectInput = z.infer<typeof updateGroupSubjectSchema>
