/**
 * HSL color utilities for branding.
 *
 * Pure functions — safe to import from any environment (server, edge, tests).
 * No side effects, no I/O.
 */

const HSL_PATTERN = /^(\d{1,3})\s+(\d{1,3})%\s+(\d{1,3})%$/

/**
 * Convert an HSL string in the CSS variable shorthand form
 * (e.g. `"221 83% 53%"`) to a `#rrggbb` hex string.
 *
 * Returns `null` for any invalid / out-of-range input.
 *
 *   hslStringToHex("221 83% 53%") === "#3b82f6"
 *   hslStringToHex("0 0% 100%")   === "#ffffff"
 *   hslStringToHex("not a color") === null
 */
export function hslStringToHex(hsl: string | null | undefined): string | null {
  if (typeof hsl !== 'string') return null
  const trimmed = hsl.trim()
  const match = HSL_PATTERN.exec(trimmed)
  if (!match) return null

  const h = Number(match[1])
  const s = Number(match[2])
  const l = Number(match[3])

  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null
  if (h < 0 || h > 360) return null
  if (s < 0 || s > 100) return null
  if (l < 0 || l > 100) return null

  const sNorm = s / 100
  const lNorm = l / 100

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm
  const hp = h / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))

  let r1 = 0
  let g1 = 0
  let b1 = 0
  if (hp >= 0 && hp < 1) {
    r1 = c
    g1 = x
    b1 = 0
  } else if (hp < 2) {
    r1 = x
    g1 = c
    b1 = 0
  } else if (hp < 3) {
    r1 = 0
    g1 = c
    b1 = x
  } else if (hp < 4) {
    r1 = 0
    g1 = x
    b1 = c
  } else if (hp < 5) {
    r1 = x
    g1 = 0
    b1 = c
  } else {
    // hp in [5, 6]
    r1 = c
    g1 = 0
    b1 = x
  }

  const m = lNorm - c / 2
  const toByte = (v: number) => {
    const n = Math.round((v + m) * 255)
    if (n < 0) return 0
    if (n > 255) return 255
    return n
  }

  const r = toByte(r1)
  const g = toByte(g1)
  const b = toByte(b1)

  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
