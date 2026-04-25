/**
 * Pure grade calculation functions — no side effects, no DB access.
 */

export type GradeEntry = {
  evaluationId: string
  value: number
}

export type EvaluationWeight = {
  id: string
  weight: number
}

export type GradingScheme = {
  scaleMin: number
  scaleMax: number
  passingGrade: number
  usesLetters: boolean
  letterMapping: Record<string, number> | null
}

/**
 * Calculate weighted average final grade.
 * Only evaluations with a matching grade entry are included.
 * Weights are re-normalized to the subset that has entries.
 */
export function calculateFinalGrade(
  grades: GradeEntry[],
  evaluations: EvaluationWeight[],
  scheme: GradingScheme,
): number {
  if (grades.length === 0 || evaluations.length === 0) return scheme.scaleMin

  const gradeMap = new Map<string, number>()
  for (const g of grades) {
    gradeMap.set(g.evaluationId, g.value)
  }

  let weightedSum = 0
  let totalWeight = 0

  for (const ev of evaluations) {
    const val = gradeMap.get(ev.id)
    if (val !== undefined) {
      weightedSum += val * ev.weight
      totalWeight += ev.weight
    }
  }

  if (totalWeight === 0) return scheme.scaleMin

  return weightedSum / totalWeight
}

/**
 * Map a numeric grade to a letter grade using the scheme's letter_mapping.
 * The mapping is { "A": 90, "B": 80, ... } meaning >= threshold gets that letter.
 * Returns null if the scheme does not use letters or mapping is absent.
 */
export function applyLetter(
  value: number,
  mapping: Record<string, number> | null,
): string | null {
  if (!mapping) return null

  const entries = Object.entries(mapping).sort((a, b) => b[1] - a[1])

  for (const [letter, threshold] of entries) {
    if (value >= threshold) return letter
  }

  return entries[entries.length - 1]?.[0] ?? null
}

/**
 * Round a numeric grade to the specified number of decimal places.
 */
export function roundGrade(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}
