export const TERM_KEYS = [
  'program',
  'course',
  'subject',
  'curriculum',
  'group',
  'cycle',
  'student',
  'teacher',
] as const

export type TermKey = (typeof TERM_KEYS)[number]

export type TermPair = {
  singular: string
  plural: string
}

export type TenantTerms = Record<TermKey, TermPair>

export const DEFAULT_TERMS: TenantTerms = {
  program: { singular: 'Programa', plural: 'Programas' },
  course: { singular: 'Curso', plural: 'Cursos' },
  subject: { singular: 'Materia', plural: 'Materias' },
  curriculum: { singular: 'Pensum', plural: 'Pensums' },
  group: { singular: 'Grupo', plural: 'Grupos' },
  cycle: { singular: 'Ciclo', plural: 'Ciclos' },
  student: { singular: 'Estudiante', plural: 'Estudiantes' },
  teacher: { singular: 'Profesor', plural: 'Profesores' },
}

export const TERM_LABELS: Record<TermKey, string> = {
  program: 'Programa',
  course: 'Curso',
  subject: 'Materia',
  curriculum: 'Pensum',
  group: 'Grupo',
  cycle: 'Ciclo',
  student: 'Estudiante',
  teacher: 'Profesor',
}
