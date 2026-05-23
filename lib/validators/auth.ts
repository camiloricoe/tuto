import { z } from 'zod/v4'

export const loginSchema = z.object({
  email: z.email('Email invalido'),
  password: z.string().min(1, 'Password requerido'),
})

export const passwordSchema = z
  .string()
  .min(10, 'Minimo 10 caracteres')
  .regex(/[a-zA-Z]/, 'Debe contener al menos una letra')
  .regex(/[0-9]/, 'Debe contener al menos un numero')

export const activateAccountSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
})

export const forgotPasswordSchema = z.object({
  email: z.email('Email invalido'),
})

export const resetPasswordSchema = z.object({
  password: passwordSchema,
})

export const DOCUMENT_TYPES = ['CC', 'CE', 'TI', 'PA', 'NIT', 'RC'] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export const PHONE_TYPES = ['mobile', 'whatsapp', 'landline'] as const
export type PhoneType = (typeof PHONE_TYPES)[number]

const emptyToUndefined = (v: unknown) =>
  typeof v === 'string' && v.trim().length === 0 ? undefined : v

const optionalDocumentType = z.preprocess(
  emptyToUndefined,
  z.enum(DOCUMENT_TYPES).optional(),
)
const optionalPhoneType = z.preprocess(
  emptyToUndefined,
  z.enum(PHONE_TYPES).optional(),
)
const optionalDocumentNumber = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(3, 'Mínimo 3 caracteres').max(30).optional(),
)
const optionalPhone = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .max(30)
    .regex(/^[\d+\-\s()]+$/, 'Teléfono inválido')
    .optional(),
)

const profileFieldsShape = {
  documentType: optionalDocumentType,
  documentNumber: optionalDocumentNumber,
  phone: optionalPhone,
  phoneType: optionalPhoneType,
}

export const inviteUserSchema = z.object({
  email: z.email('Email invalido'),
  fullName: z.string().trim().min(2, 'Nombre requerido'),
  roleCode: z.string().min(1, 'Rol requerido'),
  ...profileFieldsShape,
})

export const updateUserProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Nombre requerido'),
  ...profileFieldsShape,
})

export const createTenantSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  slug: z
    .string()
    .min(2, 'Slug requerido')
    .regex(/^[a-z0-9-]+$/, 'Solo letras minusculas, numeros y guiones'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type InviteUserInput = z.infer<typeof inviteUserSchema>
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>
export type CreateTenantInput = z.infer<typeof createTenantSchema>
