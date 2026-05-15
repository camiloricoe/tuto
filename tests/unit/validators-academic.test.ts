import { describe, it, expect } from 'vitest'
import {
  createProgramSchema,
  createPeriodSchema,
  createSubjectSchema,
  createCourseSchema,
  createEnrollmentSchema,
  createEvaluationSchema,
} from '@/lib/validators/academic'

describe('createProgramSchema', () => {
  it('accepts valid input', () => {
    const r = createProgramSchema.safeParse({
      name: 'Ingenieria',
      code: 'ING_001',
      modality: 'fixed_curriculum',
      durationPeriods: 8,
    })
    expect(r.success).toBe(true)
  })

  it('rejects modality that DB does not allow', () => {
    const r = createProgramSchema.safeParse({
      name: 'X',
      code: 'X',
      modality: 'presencial',
      durationPeriods: 1,
    })
    expect(r.success).toBe(false)
  })

  it('accepts all DB-valid modalities', () => {
    for (const m of ['fixed_curriculum', 'elective', 'cohort']) {
      const r = createProgramSchema.safeParse({
        name: 'Programa Test',
        code: 'XCODE',
        modality: m,
        durationPeriods: 1,
      })
      expect(r.success).toBe(true)
    }
  })

  it('rejects lowercase code', () => {
    const r = createProgramSchema.safeParse({
      name: 'X',
      code: 'lowercase',
      modality: 'cohort',
      durationPeriods: 1,
    })
    expect(r.success).toBe(false)
  })

  it('rejects code with spaces', () => {
    const r = createProgramSchema.safeParse({
      name: 'X',
      code: 'BAD CODE',
      modality: 'cohort',
      durationPeriods: 1,
    })
    expect(r.success).toBe(false)
  })

  it('rejects duration < 1', () => {
    const r = createProgramSchema.safeParse({
      name: 'X',
      code: 'X1',
      modality: 'cohort',
      durationPeriods: 0,
    })
    expect(r.success).toBe(false)
  })

  it('rejects name shorter than 2 chars', () => {
    const r = createProgramSchema.safeParse({
      name: 'X',
      code: 'X1',
      modality: 'cohort',
      durationPeriods: 1,
    })
    expect(r.success).toBe(false)
  })
})

describe('createPeriodSchema', () => {
  it('accepts all DB-valid kinds', () => {
    for (const k of ['bimester', 'trimester', 'quadrimester', 'semester', 'custom']) {
      const r = createPeriodSchema.safeParse({
        name: 'Periodo',
        code: 'P-2026',
        kind: k,
        startsOn: '2026-01-01',
        endsOn: '2026-06-30',
      })
      expect(r.success).toBe(true)
    }
  })

  it('rejects invalid date format', () => {
    const r = createPeriodSchema.safeParse({
      name: 'Periodo',
      code: 'P-2026',
      kind: 'semester',
      startsOn: '01/01/2026',
      endsOn: '2026-06-30',
    })
    expect(r.success).toBe(false)
  })

  it('rejects unknown kind', () => {
    const r = createPeriodSchema.safeParse({
      name: 'Periodo',
      code: 'P-2026',
      kind: 'monthly',
      startsOn: '2026-01-01',
      endsOn: '2026-06-30',
    })
    expect(r.success).toBe(false)
  })
})

describe('createSubjectSchema', () => {
  it('requires uuid program id', () => {
    const r = createSubjectSchema.safeParse({
      name: 'Math',
      code: 'MAT01',
      programId: 'not-a-uuid',
    })
    expect(r.success).toBe(false)
  })

  it('accepts optional credits and grading scheme', () => {
    const r = createSubjectSchema.safeParse({
      name: 'Math',
      code: 'MAT01',
      programId: '550e8400-e29b-41d4-a716-446655440000',
      credits: 3,
      defaultGradingSchemeId: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(r.success).toBe(true)
  })
})

describe('createCourseSchema', () => {
  it('requires three uuids', () => {
    const r = createCourseSchema.safeParse({
      subjectId: '550e8400-e29b-41d4-a716-446655440000',
      periodId: '550e8400-e29b-41d4-a716-446655440001',
      gradingSchemeId: '550e8400-e29b-41d4-a716-446655440002',
    })
    expect(r.success).toBe(true)
  })

  it('rejects when any id is malformed', () => {
    const r = createCourseSchema.safeParse({
      subjectId: 'x',
      periodId: '550e8400-e29b-41d4-a716-446655440001',
      gradingSchemeId: '550e8400-e29b-41d4-a716-446655440002',
    })
    expect(r.success).toBe(false)
  })
})

describe('createEnrollmentSchema', () => {
  it('accepts uuids', () => {
    const r = createEnrollmentSchema.safeParse({
      courseId: '550e8400-e29b-41d4-a716-446655440000',
      studentId: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(r.success).toBe(true)
  })
})

describe('createEvaluationSchema', () => {
  it('weight must be 0..1', () => {
    const ok = createEvaluationSchema.safeParse({
      courseId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Parcial 1',
      code: 'P1',
      weight: 0.3,
    })
    expect(ok.success).toBe(true)

    const bad = createEvaluationSchema.safeParse({
      courseId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Parcial 1',
      code: 'P1',
      weight: 1.5,
    })
    expect(bad.success).toBe(false)
  })
})
