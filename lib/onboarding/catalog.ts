import type { Milestone, RoleCode } from './types'

export const MILESTONES: readonly Milestone[] = [
  // ───────── SUPER ADMIN (global) ─────────
  {
    code: 'superadmin.first_real_tenant',
    role: 'super_admin',
    scope: 'global',
    title: 'Crear tu primera institucion real',
    description: 'Mas alla de los tenants de prueba, crea una institucion cliente real.',
    href: '/a/tenants',
    icon: 'building',
    order: 1,
  },
  {
    code: 'superadmin.users_invited',
    role: 'super_admin',
    scope: 'global',
    title: 'Mas de un usuario en el sistema',
    description: 'Has invitado al menos un usuario adicional a la plataforma.',
    href: '/a/users',
    icon: 'users',
    order: 2,
  },
  {
    code: 'superadmin.custom_domain',
    role: 'super_admin',
    scope: 'global',
    title: 'Configurar un dominio personalizado',
    description: 'Al menos un tenant tiene un dominio propio configurado.',
    href: '/a/tenants',
    icon: 'globe',
    order: 3,
  },
  {
    code: 'superadmin.audit_active',
    role: 'super_admin',
    scope: 'global',
    title: 'Sistema con actividad reciente',
    description: 'Al menos 10 eventos en activity_log en los ultimos 7 dias.',
    href: '/a/audit',
    icon: 'audit',
    order: 4,
  },
  {
    code: 'superadmin.platform_health',
    role: 'super_admin',
    scope: 'global',
    title: 'Salud de la plataforma verificada',
    description: 'Hay corridas de tests automaticos registradas.',
    href: '/a/health',
    icon: 'shield',
    order: 5,
  },

  // ───────── ADMIN (per-tenant) ─────────
  {
    code: 'admin.branding_customized',
    role: 'admin',
    scope: 'tenant',
    title: 'Personalizar el branding',
    description: 'Sube el logo o elige los colores de la institucion.',
    href: '/a/settings/branding',
    icon: 'palette',
    order: 1,
  },
  {
    code: 'admin.first_period',
    role: 'admin',
    scope: 'tenant',
    title: 'Crear tu primer periodo academico',
    description: 'Define el semestre, trimestre o ciclo actual.',
    href: '/a/settings/periods',
    icon: 'calendar',
    order: 2,
  },
  {
    code: 'admin.first_program',
    role: 'admin',
    scope: 'tenant',
    title: 'Crear tu primer programa',
    description: 'Carreras o programas academicos que ofrece la institucion.',
    href: '/a/academic/programs',
    icon: 'graduation',
    order: 3,
  },
  {
    code: 'admin.first_course',
    role: 'admin',
    scope: 'tenant',
    title: 'Crear tu primer curso',
    description: 'Asigna una materia a un periodo y un profesor.',
    href: '/a/academic/courses',
    icon: 'book',
    order: 4,
  },
  {
    code: 'admin.invite_teacher',
    role: 'admin',
    scope: 'tenant',
    title: 'Invitar a tu primer profesor',
    description: 'Para que pueda capturar calificaciones de sus cursos.',
    href: '/a/users/new',
    icon: 'users',
    order: 5,
  },
  {
    code: 'admin.invite_student',
    role: 'admin',
    scope: 'tenant',
    title: 'Registrar tu primer estudiante',
    description: 'Crea o importa estudiantes desde el panel de usuarios.',
    href: '/a/users/new',
    icon: 'users',
    order: 6,
  },
  {
    code: 'admin.first_payment_concept',
    role: 'admin',
    scope: 'tenant',
    title: 'Definir conceptos de cobro',
    description: 'Matricula, mensualidad, certificados, etc.',
    href: '/a/payments/concepts',
    icon: 'wallet',
    order: 7,
  },
  {
    code: 'admin.subdomain_configured',
    role: 'admin',
    scope: 'tenant',
    title: 'Subdominio configurado',
    description: 'Tu institucion tiene su propio subdominio en tuto.app.',
    href: '/a/tenants',
    icon: 'globe',
    order: 8,
  },

  // ───────── COORDINATOR (per-tenant) ─────────
  {
    code: 'coordinator.has_program',
    role: 'coordinator',
    scope: 'tenant',
    title: 'Programas configurados',
    description: 'Al menos un programa academico activo en la institucion.',
    href: '/a/academic/programs',
    icon: 'graduation',
    order: 1,
  },
  {
    code: 'coordinator.first_subject',
    role: 'coordinator',
    scope: 'tenant',
    title: 'Crear tu primera materia',
    description: 'Las materias son la base de los cursos.',
    href: '/a/academic/courses',
    icon: 'book',
    order: 2,
  },
  {
    code: 'coordinator.first_teacher_assigned',
    role: 'coordinator',
    scope: 'tenant',
    title: 'Asignar profesor a un curso',
    description: 'Al menos un curso con teacher asignado.',
    href: '/a/academic/courses',
    icon: 'users',
    order: 3,
  },
  {
    code: 'coordinator.first_enrollment',
    role: 'coordinator',
    scope: 'tenant',
    title: 'Matricular tu primer estudiante',
    description: 'Inscribe a un estudiante en un curso.',
    href: '/a/academic/courses',
    icon: 'check',
    order: 4,
  },
  {
    code: 'coordinator.first_grade_published',
    role: 'coordinator',
    scope: 'tenant',
    title: 'Publicar las primeras calificaciones',
    description: 'Tras revision, publica las notas a los estudiantes.',
    href: '/a/academic/courses',
    icon: 'stamp',
    order: 5,
  },

  // ───────── TREASURER (per-tenant) ─────────
  {
    code: 'treasurer.has_concepts',
    role: 'treasurer',
    scope: 'tenant',
    title: 'Conceptos de cobro definidos',
    description: 'Existe al menos un concepto de pago activo.',
    href: '/a/payments/concepts',
    icon: 'wallet',
    order: 1,
  },
  {
    code: 'treasurer.first_charge',
    role: 'treasurer',
    scope: 'tenant',
    title: 'Generar tu primer cargo',
    description: 'Genera un cargo para un estudiante.',
    href: '/a/payments/charges',
    icon: 'receipt',
    order: 2,
  },
  {
    code: 'treasurer.first_payment',
    role: 'treasurer',
    scope: 'tenant',
    title: 'Registrar tu primer pago',
    description: 'Captura un pago manual de un estudiante.',
    href: '/a/payments',
    icon: 'wallet',
    order: 3,
  },
  {
    code: 'treasurer.first_receipt',
    role: 'treasurer',
    scope: 'tenant',
    title: 'Generar tu primer recibo',
    description: 'Los recibos se generan automaticamente al pagar.',
    href: '/a/payments',
    icon: 'stamp',
    order: 4,
  },
  {
    code: 'treasurer.voided_flow_known',
    role: 'treasurer',
    scope: 'tenant',
    title: 'Anular un pago (entender el flujo)',
    description: 'Practica una anulacion para conocer el proceso.',
    href: '/a/payments',
    icon: 'shield',
    order: 5,
  },

  // ───────── TEACHER (per-tenant + per-user) ─────────
  {
    code: 'teacher.has_courses',
    role: 'teacher',
    scope: 'tenant',
    title: 'Tienes cursos asignados',
    description: 'Al menos un curso te ha sido asignado por el coordinator.',
    href: '/t/courses',
    icon: 'book',
    order: 1,
  },
  {
    code: 'teacher.has_students',
    role: 'teacher',
    scope: 'tenant',
    title: 'Tus cursos tienen estudiantes',
    description: 'Hay matriculas activas en al menos uno de tus cursos.',
    href: '/t/courses',
    icon: 'users',
    order: 2,
  },
  {
    code: 'teacher.first_grade',
    role: 'teacher',
    scope: 'tenant',
    title: 'Capturar tu primera nota',
    description: 'Registra una calificacion en uno de tus cursos.',
    href: '/t/courses',
    icon: 'check',
    order: 3,
  },
  {
    code: 'teacher.first_grade_published',
    role: 'teacher',
    scope: 'tenant',
    title: 'Tienes notas publicadas',
    description: 'Tras revision del coordinator, una nota tuya se publico.',
    href: '/t/courses',
    icon: 'stamp',
    order: 4,
  },

  // ───────── STUDENT (per-tenant + per-user) ─────────
  {
    code: 'student.enrolled',
    role: 'student',
    scope: 'tenant',
    title: 'Estas matriculado en cursos',
    description: 'Aparecen tus cursos del periodo actual.',
    href: '/s/courses',
    icon: 'book',
    order: 1,
  },
  {
    code: 'student.has_grades',
    role: 'student',
    scope: 'tenant',
    title: 'Tienes calificaciones disponibles',
    description: 'Tus profesores ya registraron al menos una nota.',
    href: '/s/grades',
    icon: 'star',
    order: 2,
  },
  {
    code: 'student.has_charges',
    role: 'student',
    scope: 'tenant',
    title: 'Estado de cuenta visible',
    description: 'Tienes cargos registrados en tu cuenta.',
    href: '/s/payments',
    icon: 'wallet',
    order: 3,
  },
  {
    code: 'student.has_payment',
    role: 'student',
    scope: 'tenant',
    title: 'Primer pago registrado',
    description: 'Al hacer tu primer pago podras descargar el recibo.',
    href: '/s/payments',
    icon: 'receipt',
    order: 4,
  },
  {
    code: 'student.profile_complete',
    role: 'student',
    scope: 'tenant',
    title: 'Perfil completo',
    description: 'Foto/avatar configurado y nombre completo.',
    href: '/s',
    icon: 'check',
    order: 5,
  },
]

export function getMilestonesForRole(role: RoleCode): Milestone[] {
  return MILESTONES.filter((m) => m.role === role).sort((a, b) => a.order - b.order)
}

export function getMilestone(code: string): Milestone | undefined {
  return MILESTONES.find((m) => m.code === code)
}

const ROLE_PRIORITY: RoleCode[] = [
  'super_admin',
  'admin',
  'coordinator',
  'treasurer',
  'teacher',
  'student',
]

export function pickPrimaryRole(roles: string[]): RoleCode | null {
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return r
  }
  return null
}

export function pickRoleForPortal(
  roles: string[],
  portal: '/a' | '/t' | '/s',
): RoleCode | null {
  if (portal === '/t') return roles.includes('teacher') ? 'teacher' : null
  if (portal === '/s') return roles.includes('student') ? 'student' : null
  // portal === '/a'
  if (roles.includes('super_admin')) return 'super_admin'
  if (roles.includes('admin')) return 'admin'
  if (roles.includes('coordinator')) return 'coordinator'
  if (roles.includes('treasurer')) return 'treasurer'
  return null
}
