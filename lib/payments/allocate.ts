/**
 * Pure payment allocation functions — no side effects, no DB access.
 */

export type PendingCharge = {
  id: string
  amount: number
  amountPaid: number
  dueDate: string // ISO date string YYYY-MM-DD
}

export type AllocationSuggestion = {
  chargeId: string
  amountApplied: number
}

/**
 * Suggest how to allocate a payment across pending charges using FIFO by due_date.
 * Charges are sorted ascending by due_date (oldest first).
 * Returns a list of allocation suggestions that sum up to at most paymentAmount.
 */
export function suggestAllocation(
  paymentAmount: number,
  pendingCharges: PendingCharge[],
): AllocationSuggestion[] {
  if (paymentAmount <= 0 || pendingCharges.length === 0) return []

  const sorted = [...pendingCharges].sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const suggestions: AllocationSuggestion[] = []
  let remaining = paymentAmount

  for (const charge of sorted) {
    if (remaining <= 0) break

    const balance = charge.amount - charge.amountPaid
    if (balance <= 0) continue

    const apply = Math.min(balance, remaining)
    suggestions.push({ chargeId: charge.id, amountApplied: apply })
    remaining -= apply
  }

  return suggestions
}
