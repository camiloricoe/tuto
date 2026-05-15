import { describe, it, expect } from 'vitest'
import { getPortalForRoles } from '@/lib/auth/session'

describe('getPortalForRoles', () => {
  it('routes super_admin to /a', () => {
    expect(getPortalForRoles(['super_admin'])).toBe('/a')
  })
  it('routes admin to /a', () => {
    expect(getPortalForRoles(['admin'])).toBe('/a')
  })
  it('routes coordinator to /a', () => {
    expect(getPortalForRoles(['coordinator'])).toBe('/a')
  })
  it('routes treasurer to /a', () => {
    expect(getPortalForRoles(['treasurer'])).toBe('/a')
  })
  it('routes teacher to /t', () => {
    expect(getPortalForRoles(['teacher'])).toBe('/t')
  })
  it('routes student (and unknown) to /s', () => {
    expect(getPortalForRoles(['student'])).toBe('/s')
    expect(getPortalForRoles([])).toBe('/s')
    expect(getPortalForRoles(['unknown'])).toBe('/s')
  })
  it('admin role wins over teacher when user has both', () => {
    expect(getPortalForRoles(['teacher', 'admin'])).toBe('/a')
  })
  it('teacher beats student when user has both', () => {
    expect(getPortalForRoles(['student', 'teacher'])).toBe('/t')
  })
})
