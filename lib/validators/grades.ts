import { z } from 'zod/v4'

export const gradeDraftSchema = z.object({
  enrollmentId: z.string().uuid('ID de inscripcion invalido'),
  evaluationId: z.string().uuid('ID de evaluacion invalido'),
  value: z.number().min(0, 'La nota no puede ser negativa'),
  comment: z.string().optional(),
})

export const saveGradeDraftsSchema = z.object({
  courseId: z.string().uuid('ID de curso invalido'),
  grades: z.array(gradeDraftSchema).min(1, 'Se requiere al menos una nota'),
})

export const publishGradesSchema = z.object({
  courseId: z.string().uuid('ID de curso invalido'),
})

export const closeCourseSchema = z.object({
  courseId: z.string().uuid('ID de curso invalido'),
})

export type GradeDraftInput = z.infer<typeof gradeDraftSchema>
export type SaveGradeDraftsInput = z.infer<typeof saveGradeDraftsSchema>
export type PublishGradesInput = z.infer<typeof publishGradesSchema>
export type CloseCourseInput = z.infer<typeof closeCourseSchema>
