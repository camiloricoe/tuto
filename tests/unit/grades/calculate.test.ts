import { describe, it, expect } from 'vitest'
import {
  calculateFinalGrade,
  applyLetter,
  roundGrade,
  type GradeEntry,
  type EvaluationWeight,
  type GradingScheme,
} from '@/lib/grades/calculate'

const baseScheme: GradingScheme = {
  scaleMin: 0,
  scaleMax: 100,
  passingGrade: 60,
  usesLetters: true,
  letterMapping: { A: 90, B: 80, C: 70, D: 60, F: 0 },
}

describe('calculateFinalGrade', () => {
  it('returns scaleMin when no grades provided', () => {
    const result = calculateFinalGrade([], [], baseScheme)
    expect(result).toBe(0)
  })

  it('returns scaleMin when grades array is empty', () => {
    const evaluations: EvaluationWeight[] = [{ id: 'ev1', weight: 0.5 }]
    const result = calculateFinalGrade([], evaluations, baseScheme)
    expect(result).toBe(0)
  })

  it('calculates simple average for equal weights', () => {
    const grades: GradeEntry[] = [
      { evaluationId: 'ev1', value: 80 },
      { evaluationId: 'ev2', value: 90 },
    ]
    const evaluations: EvaluationWeight[] = [
      { id: 'ev1', weight: 0.5 },
      { id: 'ev2', weight: 0.5 },
    ]
    const result = calculateFinalGrade(grades, evaluations, baseScheme)
    expect(result).toBe(85)
  })

  it('applies different weights correctly', () => {
    const grades: GradeEntry[] = [
      { evaluationId: 'ev1', value: 70 },
      { evaluationId: 'ev2', value: 90 },
    ]
    const evaluations: EvaluationWeight[] = [
      { id: 'ev1', weight: 0.3 },
      { id: 'ev2', weight: 0.7 },
    ]
    const result = calculateFinalGrade(grades, evaluations, baseScheme)
    // 70*0.3 + 90*0.7 = 21 + 63 = 84
    expect(result).toBeCloseTo(84, 5)
  })

  it('normalizes weights when only some evaluations have grades', () => {
    const grades: GradeEntry[] = [
      { evaluationId: 'ev1', value: 80 },
    ]
    const evaluations: EvaluationWeight[] = [
      { id: 'ev1', weight: 0.5 },
      { id: 'ev2', weight: 0.5 },
    ]
    // Only ev1 has a grade, so totalWeight = 0.5, result = 80*0.5 / 0.5 = 80
    const result = calculateFinalGrade(grades, evaluations, baseScheme)
    expect(result).toBe(80)
  })

  it('ignores grade entries with no matching evaluation', () => {
    const grades: GradeEntry[] = [
      { evaluationId: 'ev_unknown', value: 100 },
      { evaluationId: 'ev1', value: 70 },
    ]
    const evaluations: EvaluationWeight[] = [{ id: 'ev1', weight: 1.0 }]
    const result = calculateFinalGrade(grades, evaluations, baseScheme)
    expect(result).toBe(70)
  })
})

describe('applyLetter', () => {
  const mapping = { A: 90, B: 80, C: 70, D: 60, F: 0 }

  it('returns null when mapping is null', () => {
    expect(applyLetter(95, null)).toBeNull()
  })

  it('returns A for 90', () => {
    expect(applyLetter(90, mapping)).toBe('A')
  })

  it('returns A for 95', () => {
    expect(applyLetter(95, mapping)).toBe('A')
  })

  it('returns B for 85', () => {
    expect(applyLetter(85, mapping)).toBe('B')
  })

  it('returns C for 72', () => {
    expect(applyLetter(72, mapping)).toBe('C')
  })

  it('returns D for 60', () => {
    expect(applyLetter(60, mapping)).toBe('D')
  })

  it('returns F for 30', () => {
    expect(applyLetter(30, mapping)).toBe('F')
  })

  it('returns F for 0', () => {
    expect(applyLetter(0, mapping)).toBe('F')
  })
})

describe('roundGrade', () => {
  it('rounds to 0 decimals', () => {
    expect(roundGrade(85.6, 0)).toBe(86)
  })

  it('rounds to 1 decimal', () => {
    expect(roundGrade(85.65, 1)).toBe(85.7)
  })

  it('rounds to 2 decimals', () => {
    expect(roundGrade(85.678, 2)).toBe(85.68)
  })

  it('does not change integer values', () => {
    expect(roundGrade(90, 2)).toBe(90)
  })

  it('handles rounding down', () => {
    expect(roundGrade(85.634, 2)).toBe(85.63)
  })
})
