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

export const inviteUserSchema = z.object({
  email: z.email('Email invalido'),
  fullName: z.string().min(2, 'Nombre requerido'),
  roleCode: z.string().min(1, 'Rol requerido'),
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
export type CreateTenantInput = z.infer<typeof createTenantSchema>
