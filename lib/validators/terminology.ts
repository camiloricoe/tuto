import { z } from 'zod/v4'
import { TERM_KEYS } from '@/lib/terminology/defaults'

const termPairSchema = z.object({
  singular: z
    .string({ error: 'Singular requerido' })
    .trim()
    .min(1, 'Singular requerido')
    .max(60, 'Maximo 60 caracteres'),
  plural: z
    .string({ error: 'Plural requerido' })
    .trim()
    .min(1, 'Plural requerido')
    .max(60, 'Maximo 60 caracteres'),
})

export const updateTerminologySchema = z.object({
  program: termPairSchema,
  course: termPairSchema,
  subject: termPairSchema,
  curriculum: termPairSchema,
  group: termPairSchema,
  cycle: termPairSchema,
  student: termPairSchema,
  teacher: termPairSchema,
})

export type UpdateTerminologyInput = z.infer<typeof updateTerminologySchema>

export { TERM_KEYS }
