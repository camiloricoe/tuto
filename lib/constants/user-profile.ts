import { DOCUMENT_TYPES, PHONE_TYPES } from '@/lib/validators/auth'
import type { DocumentType, PhoneType } from '@/lib/validators/auth'

type Option<T extends string> = { value: T; label: string }

export const DOCUMENT_TYPE_OPTIONS: Array<Option<DocumentType>> = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'PA', label: 'Pasaporte' },
  { value: 'NIT', label: 'NIT' },
  { value: 'RC', label: 'Registro civil' },
]

export const PHONE_TYPE_OPTIONS: Array<Option<PhoneType>> = [
  { value: 'mobile', label: 'Móvil' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'landline', label: 'Fijo' },
]

const DOCUMENT_TYPE_LABELS = Object.fromEntries(
  DOCUMENT_TYPE_OPTIONS.map((opt) => [opt.value, opt.label]),
) as Record<DocumentType, string>

const PHONE_TYPE_LABELS = Object.fromEntries(
  PHONE_TYPE_OPTIONS.map((opt) => [opt.value, opt.label]),
) as Record<PhoneType, string>

const DOCUMENT_TYPE_SET: ReadonlySet<string> = new Set(DOCUMENT_TYPES)
const PHONE_TYPE_SET: ReadonlySet<string> = new Set(PHONE_TYPES)

export function documentTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return DOCUMENT_TYPE_SET.has(value)
    ? DOCUMENT_TYPE_LABELS[value as DocumentType]
    : value
}

export function phoneTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return PHONE_TYPE_SET.has(value)
    ? PHONE_TYPE_LABELS[value as PhoneType]
    : value
}
