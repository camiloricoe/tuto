import { describe, it, expect } from 'vitest'
import { suggestAllocation, type PendingCharge } from '@/lib/payments/allocate'

describe('suggestAllocation', () => {
  it('returns empty array when payment amount is 0', () => {
    const charges: PendingCharge[] = [
      { id: 'c1', amount: 100, amountPaid: 0, dueDate: '2024-01-01' },
    ]
    expect(suggestAllocation(0, charges)).toEqual([])
  })

  it('returns empty array when payment amount is negative', () => {
    const charges: PendingCharge[] = [
      { id: 'c1', amount: 100, amountPaid: 0, dueDate: '2024-01-01' },
    ]
    expect(suggestAllocation(-50, charges)).toEqual([])
  })

  it('returns empty array when no charges', () => {
    expect(suggestAllocation(100, [])).toEqual([])
  })

  it('fully pays a single charge', () => {
    const charges: PendingCharge[] = [
      { id: 'c1', amount: 100, amountPaid: 0, dueDate: '2024-01-01' },
    ]
    const result = suggestAllocation(100, charges)
    expect(result).toEqual([{ chargeId: 'c1', amountApplied: 100 }])
  })

  it('partially pays a single charge when payment is less', () => {
    const charges: PendingCharge[] = [
      { id: 'c1', amount: 200, amountPaid: 0, dueDate: '2024-01-01' },
    ]
    const result = suggestAllocation(100, charges)
    expect(result).toEqual([{ chargeId: 'c1', amountApplied: 100 }])
  })

  it('applies FIFO order — oldest due date first', () => {
    const charges: PendingCharge[] = [
      { id: 'c2', amount: 100, amountPaid: 0, dueDate: '2024-03-01' },
      { id: 'c1', amount: 100, amountPaid: 0, dueDate: '2024-01-01' },
      { id: 'c3', amount: 100, amountPaid: 0, dueDate: '2024-02-01' },
    ]
    const result = suggestAllocation(150, charges)
    expect(result).toEqual([
      { chargeId: 'c1', amountApplied: 100 },
      { chargeId: 'c3', amountApplied: 50 },
    ])
  })

  it('pays multiple charges exactly', () => {
    const charges: PendingCharge[] = [
      { id: 'c1', amount: 100, amountPaid: 0, dueDate: '2024-01-01' },
      { id: 'c2', amount: 200, amountPaid: 0, dueDate: '2024-02-01' },
    ]
    const result = suggestAllocation(300, charges)
    expect(result).toEqual([
      { chargeId: 'c1', amountApplied: 100 },
      { chargeId: 'c2', amountApplied: 200 },
    ])
  })

  it('skips charges already fully paid', () => {
    const charges: PendingCharge[] = [
      { id: 'c1', amount: 100, amountPaid: 100, dueDate: '2024-01-01' },
      { id: 'c2', amount: 100, amountPaid: 0, dueDate: '2024-02-01' },
    ]
    const result = suggestAllocation(50, charges)
    expect(result).toEqual([{ chargeId: 'c2', amountApplied: 50 }])
  })

  it('accounts for partial prior payments', () => {
    const charges: PendingCharge[] = [
      { id: 'c1', amount: 100, amountPaid: 60, dueDate: '2024-01-01' },
    ]
    const result = suggestAllocation(80, charges)
    // Only 40 remaining balance, apply 40 (not 80)
    expect(result).toEqual([{ chargeId: 'c1', amountApplied: 40 }])
  })

  it('stops allocating when payment is exhausted', () => {
    const charges: PendingCharge[] = [
      { id: 'c1', amount: 100, amountPaid: 0, dueDate: '2024-01-01' },
      { id: 'c2', amount: 100, amountPaid: 0, dueDate: '2024-02-01' },
      { id: 'c3', amount: 100, amountPaid: 0, dueDate: '2024-03-01' },
    ]
    const result = suggestAllocation(100, charges)
    expect(result).toEqual([{ chargeId: 'c1', amountApplied: 100 }])
    expect(result).toHaveLength(1)
  })
})
