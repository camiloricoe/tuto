import { describe, it, expect } from 'vitest'
import { hslStringToHex } from '@/lib/branding/colors'

describe('hslStringToHex', () => {
  // ---- Happy path conversions -------------------------------------------------
  it('converts the canonical Tailwind blue ("221 83% 53%") to its hex equivalent', () => {
    // Pure HSL→RGB conversion of (221, 83%, 53%). Tailwind's #3b82f6 token
    // is derived from a slightly different hue (220) plus rounding, so the
    // value below reflects exact math from this input.
    expect(hslStringToHex('221 83% 53%')).toBe('#2463eb')
  })

  it('converts pure white ("0 0% 100%") to #ffffff', () => {
    expect(hslStringToHex('0 0% 100%')).toBe('#ffffff')
  })

  it('converts pure black ("0 0% 0%") to #000000', () => {
    expect(hslStringToHex('0 0% 0%')).toBe('#000000')
  })

  it('converts mid grey ("0 0% 50%") to a neutral hex', () => {
    expect(hslStringToHex('0 0% 50%')).toBe('#808080')
  })

  it('converts pure red ("0 100% 50%") to #ff0000', () => {
    expect(hslStringToHex('0 100% 50%')).toBe('#ff0000')
  })

  it('converts pure green ("120 100% 50%") to #00ff00', () => {
    expect(hslStringToHex('120 100% 50%')).toBe('#00ff00')
  })

  it('converts pure blue ("240 100% 50%") to #0000ff', () => {
    expect(hslStringToHex('240 100% 50%')).toBe('#0000ff')
  })

  it('converts hue at 360 the same as 0 (red)', () => {
    expect(hslStringToHex('360 100% 50%')).toBe('#ff0000')
  })

  it('tolerates surrounding whitespace', () => {
    expect(hslStringToHex('   221 83% 53%   ')).toBe('#2463eb')
  })

  it('emits lowercase hex with leading hash and 6 chars', () => {
    const out = hslStringToHex('30 100% 50%')
    expect(out).toMatch(/^#[0-9a-f]{6}$/)
  })

  // ---- Invalid / edge cases ---------------------------------------------------
  it('returns null for null input', () => {
    expect(hslStringToHex(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(hslStringToHex(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(hslStringToHex('')).toBeNull()
  })

  it('returns null when percent signs are missing', () => {
    expect(hslStringToHex('221 83 53')).toBeNull()
  })

  it('returns null when commas are used (CSS legacy form)', () => {
    expect(hslStringToHex('221, 83%, 53%')).toBeNull()
  })

  it('returns null when wrapped in hsl(...) function notation', () => {
    expect(hslStringToHex('hsl(221 83% 53%)')).toBeNull()
  })

  it('returns null when hue exceeds 360', () => {
    expect(hslStringToHex('400 50% 50%')).toBeNull()
  })

  it('returns null when saturation exceeds 100%', () => {
    expect(hslStringToHex('200 150% 50%')).toBeNull()
  })

  it('returns null when lightness exceeds 100%', () => {
    expect(hslStringToHex('200 50% 150%')).toBeNull()
  })

  it('returns null for non-string input passed at runtime', () => {
    expect(hslStringToHex(42 as unknown as string)).toBeNull()
    expect(hslStringToHex({} as unknown as string)).toBeNull()
  })

  it('round-trips a few extra branded colors to deterministic hex', () => {
    // Pure HSL→RGB math for the given inputs. These lock the conversion so
    // future refactors of the function are caught immediately.
    expect(hslStringToHex('0 84% 60%')).toBe('#ef4343')
    expect(hslStringToHex('142 76% 36%')).toBe('#16a249')
  })
})
