import { z } from 'zod/v4'

export const createProgramSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  code: z
    .string()
    .min(2, 'Codigo requerido')
    .regex(/^[A-Z0-9_-]+$/, 'Solo mayusculas, numeros y guiones'),
  modality: z.enum(['fixed_curriculum', 'elective', 'cohort'], {
    error: 'Modalidad invalida',
  }),
  durationPeriods: z.number().int().min(1, 'Duracion minima 1 periodo'),
  description: z.string().optional(),
})

export const updateProgramSchema = createProgramSchema.partial()

export const createPeriodSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  code: z
    .string()
    .min(2, 'Codigo requerido')
    .regex(/^[A-Z0-9_-]+$/, 'Solo mayusculas, numeros y guiones'),
  kind: z.enum(['bimester', 'trimester', 'quadrimester', 'semester', 'custom'], {
    error: 'Tipo invalido',
  }),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha invalida (YYYY-MM-DD)'),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha invalida (YYYY-MM-DD)'),
  programId: z.string().uuid('ID de programa invalido').optional(),
  active: z.boolean().optional(),
})

export const createSubjectSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  code: z
    .string()
    .min(2, 'Codigo requerido')
    .regex(/^[A-Z0-9_-]+$/, 'Solo mayusculas, numeros y guiones'),
  programId: z.string().uuid('ID de programa invalido'),
  credits: z.number().int().min(0).optional(),
  defaultGradingSchemeId: z.string().uuid().optional(),
})

export const createCourseSchema = z.object({
  subjectId: z.string().uuid('ID de materia invalido'),
  periodId: z.string().uuid('ID de periodo invalido'),
  gradingSchemeId: z.string().uuid('ID de esquema de calificacion invalido'),
  teacherId: z.string().uuid('ID de docente invalido').optional(),
  sectionCode: z.string().optional(),
  maxStudents: z.number().int().min(1).optional(),
})

export const updateCourseSchema = createCourseSchema.partial()

export const createEnrollmentSchema = z.object({
  courseId: z.string().uuid('ID de curso invalido'),
  studentId: z.string().uuid('ID de estudiante invalido'),
})

export const createEvaluationSchema = z.object({
  courseId: z.string().uuid('ID de curso invalido'),
  name: z.string().min(2, 'Nombre requerido'),
  code: z
    .string()
    .min(1, 'Codigo requerido')
    .regex(/^[A-Z0-9_-]+$/, 'Solo mayusculas, numeros y guiones'),
  weight: z.number().min(0).max(1, 'El peso debe estar entre 0 y 1'),
  sequence: z.number().int().min(1).optional(),
  dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha invalida').optional(),
})

export type CreateProgramInput = z.infer<typeof createProgramSchema>
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>
export type CreatePeriodInput = z.infer<typeof createPeriodSchema>
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>
export type CreateCourseInput = z.infer<typeof createCourseSchema>
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>
export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>
export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>
