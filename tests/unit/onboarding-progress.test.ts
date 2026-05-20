import { describe, it, expect } from 'vitest'
import { computeProgress } from '@/lib/onboarding/progress'
import type { Milestone } from '@/lib/onboarding/types'

const M = (code: string, order = 1): Milestone => ({
  code,
  role: 'admin',
  scope: 'tenant',
  title: code,
  description: 'desc ' + code,
  href: '/a',
  icon: 'check',
  order,
})

describe('computeProgress', () => {
  it('returns 0% when nothing completed', () => {
    const ms = [M('a', 1), M('b', 2), M('c', 3)]
    const result = computeProgress('admin', ms, new Map(), new Set())
    expect(result.total).toBe(3)
    expect(result.completed).toBe(0)
    expect(result.dismissed).toBe(0)
    expect(result.pending).toBe(3)
    expect(result.percent).toBe(0)
  })

  it('returns 100% when all completed', () => {
    const ms = [M('a'), M('b')]
    const completion = new Map([
      ['a', true],
      ['b', true],
    ])
    const result = computeProgress('admin', ms, completion, new Set())
    expect(result.completed).toBe(2)
    expect(result.percent).toBe(100)
    expect(result.pending).toBe(0)
  })

  it('does not count completed as dismissed when both flags are set', () => {
    const ms = [M('a'), M('b')]
    const completion = new Map([['a', true]])
    const dismissals = new Set(['a', 'b'])
    const result = computeProgress('admin', ms, completion, dismissals)
    expect(result.completed).toBe(1)
    expect(result.dismissed).toBe(1) // only 'b' is dismissed-not-completed
    expect(result.pending).toBe(0)
  })

  it('excludes dismissed milestones from denominator', () => {
    // 3 total, 1 completed, 1 dismissed, 1 pending → 1/2 = 50%
    const ms = [M('a'), M('b'), M('c')]
    const completion = new Map([['a', true]])
    const dismissals = new Set(['b'])
    const result = computeProgress('admin', ms, completion, dismissals)
    expect(result.percent).toBe(50)
    expect(result.pending).toBe(1)
  })

  it('returns 0% (not NaN) when all milestones are dismissed', () => {
    const ms = [M('a'), M('b')]
    const dismissals = new Set(['a', 'b'])
    const result = computeProgress('admin', ms, new Map(), dismissals)
    expect(result.percent).toBe(0)
    expect(Number.isFinite(result.percent)).toBe(true)
  })

  it('handles empty milestone list gracefully', () => {
    const result = computeProgress('admin', [], new Map(), new Set())
    expect(result.total).toBe(0)
    expect(result.completed).toBe(0)
    expect(result.percent).toBe(0)
    expect(result.scope).toBe('tenant') // default
  })

  it('preserves items array in catalog order', () => {
    const ms = [M('z', 1), M('y', 2), M('x', 3)]
    const result = computeProgress('admin', ms, new Map([['y', true]]), new Set())
    expect(result.items.map((i) => i.milestone.code)).toEqual(['z', 'y', 'x'])
    const second = result.items[1]
    expect(second?.completed).toBe(true)
  })
})
