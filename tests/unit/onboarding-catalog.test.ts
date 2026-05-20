import { describe, it, expect } from 'vitest'
import {
  MILESTONES,
  getMilestonesForRole,
  getMilestone,
  pickPrimaryRole,
  pickRoleForPortal,
} from '@/lib/onboarding/catalog'
import type { RoleCode } from '@/lib/onboarding/types'

describe('onboarding/catalog', () => {
  describe('MILESTONES catalog', () => {
    it('has milestones for every role', () => {
      const roles: RoleCode[] = [
        'super_admin',
        'admin',
        'coordinator',
        'treasurer',
        'teacher',
        'student',
      ]
      for (const role of roles) {
        const ms = getMilestonesForRole(role)
        expect(ms.length, `role=${role}`).toBeGreaterThanOrEqual(4)
      }
    })

    it('uses unique milestone codes', () => {
      const codes = MILESTONES.map((m) => m.code)
      const unique = new Set(codes)
      expect(unique.size).toBe(codes.length)
    })

    it('super_admin milestones are global, others are tenant-scoped', () => {
      for (const m of MILESTONES) {
        if (m.role === 'super_admin') {
          expect(m.scope, `code=${m.code}`).toBe('global')
        } else {
          expect(m.scope, `code=${m.code}`).toBe('tenant')
        }
      }
    })

    it('all milestone hrefs match portal of their role', () => {
      for (const m of MILESTONES) {
        if (m.role === 'teacher') {
          expect(m.href.startsWith('/t'), `code=${m.code}`).toBe(true)
        } else if (m.role === 'student') {
          expect(m.href.startsWith('/s'), `code=${m.code}`).toBe(true)
        } else {
          expect(m.href.startsWith('/a'), `code=${m.code}`).toBe(true)
        }
      }
    })

    it('each milestone has non-empty title and description', () => {
      for (const m of MILESTONES) {
        expect(m.title.length, `code=${m.code}`).toBeGreaterThan(3)
        expect(m.description.length, `code=${m.code}`).toBeGreaterThan(5)
      }
    })

    it('order is consistent within a role (no duplicates)', () => {
      const byRole = new Map<string, number[]>()
      for (const m of MILESTONES) {
        const list = byRole.get(m.role) ?? []
        list.push(m.order)
        byRole.set(m.role, list)
      }
      for (const [role, orders] of byRole.entries()) {
        const unique = new Set(orders)
        expect(unique.size, `role=${role}`).toBe(orders.length)
      }
    })
  })

  describe('getMilestone', () => {
    it('returns the milestone by code', () => {
      const m = getMilestone('admin.first_program')
      expect(m).toBeDefined()
      expect(m?.role).toBe('admin')
    })

    it('returns undefined for unknown code', () => {
      expect(getMilestone('does.not.exist')).toBeUndefined()
    })
  })

  describe('pickPrimaryRole', () => {
    it('picks super_admin first when present', () => {
      expect(pickPrimaryRole(['student', 'super_admin', 'admin'])).toBe('super_admin')
    })
    it('falls back to admin > coordinator > treasurer > teacher > student', () => {
      expect(pickPrimaryRole(['student', 'teacher', 'admin'])).toBe('admin')
      expect(pickPrimaryRole(['student', 'teacher', 'coordinator'])).toBe('coordinator')
      expect(pickPrimaryRole(['student', 'teacher', 'treasurer'])).toBe('treasurer')
      expect(pickPrimaryRole(['student', 'teacher'])).toBe('teacher')
      expect(pickPrimaryRole(['student'])).toBe('student')
    })
    it('returns null when no known role is present', () => {
      expect(pickPrimaryRole(['unknown'])).toBe(null)
      expect(pickPrimaryRole([])).toBe(null)
    })
  })

  describe('pickRoleForPortal', () => {
    it('teacher portal returns teacher only', () => {
      expect(pickRoleForPortal(['teacher', 'admin'], '/t')).toBe('teacher')
      expect(pickRoleForPortal(['admin'], '/t')).toBe(null)
    })
    it('student portal returns student only', () => {
      expect(pickRoleForPortal(['student'], '/s')).toBe('student')
      expect(pickRoleForPortal(['teacher'], '/s')).toBe(null)
    })
    it('admin portal: super_admin > admin > coordinator > treasurer', () => {
      expect(pickRoleForPortal(['admin', 'super_admin'], '/a')).toBe('super_admin')
      expect(pickRoleForPortal(['admin', 'coordinator'], '/a')).toBe('admin')
      expect(pickRoleForPortal(['treasurer', 'coordinator'], '/a')).toBe('coordinator')
      expect(pickRoleForPortal(['treasurer'], '/a')).toBe('treasurer')
      expect(pickRoleForPortal(['student'], '/a')).toBe(null)
    })
  })
})
