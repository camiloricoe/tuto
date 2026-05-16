// ─── Custom domain validation ──────────────────────────────────────────────
//
// Used by the super-admin custom-domains page to validate a fully qualified
// domain name (FQDN) before persisting it to the `tenants.custom_domain`
// column. The DB enforces uniqueness, but we validate format up-front to
// give nicer error messages and prevent obvious bad inputs from hitting
// the database.
//
// Rules:
//   • Lowercase ASCII letters, digits, and hyphens only inside labels.
//   • Labels separated by single dots.
//   • Each label 1–63 characters, must not start or end with a hyphen.
//   • Full length 1–253 characters (RFC 1035).
//   • Must have at least two labels (i.e., contain a dot — no bare hostnames).
//   • No scheme (http://, https://), no path, no port, no user info.
//   • No leading/trailing/consecutive dots.
//   • No IP addresses (IPv4 or IPv6) — these must not occupy the custom_domain
//     column.

export type DomainValidationResult =
  | { ok: true; normalized: string }
  | { ok: false; error: string }

const MAX_DOMAIN_LENGTH = 253
const MAX_LABEL_LENGTH = 63

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/

export function validateCustomDomain(raw: string | null | undefined): DomainValidationResult {
  if (raw == null) return { ok: false, error: 'Dominio requerido' }

  // Reject if it's not even a string (defensive against bad form data).
  if (typeof raw !== 'string') return { ok: false, error: 'Dominio invalido' }

  // Trim outer whitespace, then lowercase. Internal whitespace is rejected
  // by the label regex below.
  const trimmed = raw.trim()
  if (trimmed.length === 0) return { ok: false, error: 'Dominio requerido' }

  const domain = trimmed.toLowerCase()

  // Reject schemes.
  if (/^[a-z][a-z0-9+\-.]*:\/\//.test(domain)) {
    return { ok: false, error: 'No incluyas http:// o https://' }
  }

  // Reject anything that smells like a URL path / query / port / user-info.
  if (/[\/\\?#@:\s]/.test(domain)) {
    return { ok: false, error: 'El dominio no debe incluir rutas, puertos ni espacios' }
  }

  // Length check (overall).
  if (domain.length > MAX_DOMAIN_LENGTH) {
    return { ok: false, error: `Maximo ${MAX_DOMAIN_LENGTH} caracteres` }
  }

  // Reject leading/trailing dot.
  if (domain.startsWith('.') || domain.endsWith('.')) {
    return { ok: false, error: 'El dominio no puede empezar ni terminar con punto' }
  }

  // Reject consecutive dots / empty labels.
  if (domain.includes('..')) {
    return { ok: false, error: 'El dominio no puede tener puntos consecutivos' }
  }

  // Reject IPv4 addresses.
  if (IPV4_RE.test(domain)) {
    return { ok: false, error: 'No se permiten direcciones IP' }
  }

  const labels = domain.split('.')
  if (labels.length < 2) {
    return { ok: false, error: 'Debe ser un dominio completo (ej: portal.miinstituto.edu.co)' }
  }

  for (const label of labels) {
    if (label.length === 0) {
      return { ok: false, error: 'El dominio contiene una etiqueta vacia' }
    }
    if (label.length > MAX_LABEL_LENGTH) {
      return { ok: false, error: `Cada parte del dominio debe tener maximo ${MAX_LABEL_LENGTH} caracteres` }
    }
    if (label.startsWith('-') || label.endsWith('-')) {
      return { ok: false, error: 'Las partes del dominio no pueden empezar ni terminar con guion' }
    }
    if (!/^[a-z0-9-]+$/.test(label)) {
      return { ok: false, error: 'Solo se permiten letras ASCII, numeros y guiones' }
    }
  }

  // The TLD (last label) must contain at least one letter — pure-numeric TLDs
  // aren't valid (and this catches partial IP-like inputs that slipped past
  // the IPv4 check).
  const tld = labels[labels.length - 1]!
  if (!/[a-z]/.test(tld)) {
    return { ok: false, error: 'El TLD debe contener letras' }
  }

  return { ok: true, normalized: domain }
}
