import { describe, it, expect } from 'vitest'
import { validateCustomDomain } from '@/lib/validators/custom-domain'

describe('validateCustomDomain — valid cases', () => {
  it('accepts a simple two-label domain', () => {
    const r = validateCustomDomain('example.com')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.normalized).toBe('example.com')
  })

  it('accepts a subdomain', () => {
    const r = validateCustomDomain('portal.indecap.edu.co')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.normalized).toBe('portal.indecap.edu.co')
  })

  it('accepts deep subdomains', () => {
    const r = validateCustomDomain('a.b.c.d.example.com')
    expect(r.ok).toBe(true)
  })

  it('accepts hyphens inside labels', () => {
    const r = validateCustomDomain('mi-portal.edu-tech.co')
    expect(r.ok).toBe(true)
  })

  it('accepts numeric labels (not leading the TLD)', () => {
    const r = validateCustomDomain('123.example.com')
    expect(r.ok).toBe(true)
  })

  it('lowercases mixed-case input', () => {
    const r = validateCustomDomain('Portal.MiInstituto.EDU.co')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.normalized).toBe('portal.miinstituto.edu.co')
  })

  it('trims surrounding whitespace', () => {
    const r = validateCustomDomain('   portal.example.com  ')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.normalized).toBe('portal.example.com')
  })

  it('accepts max-length label (63 chars)', () => {
    const label = 'a'.repeat(63)
    const r = validateCustomDomain(`${label}.com`)
    expect(r.ok).toBe(true)
  })
})

describe('validateCustomDomain — invalid cases', () => {
  it('rejects null', () => {
    const r = validateCustomDomain(null)
    expect(r.ok).toBe(false)
  })

  it('rejects undefined', () => {
    const r = validateCustomDomain(undefined)
    expect(r.ok).toBe(false)
  })

  it('rejects empty string', () => {
    const r = validateCustomDomain('')
    expect(r.ok).toBe(false)
  })

  it('rejects whitespace-only', () => {
    const r = validateCustomDomain('   ')
    expect(r.ok).toBe(false)
  })

  it('rejects URL with scheme', () => {
    const r = validateCustomDomain('https://example.com')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.toLowerCase()).toContain('http')
  })

  it('rejects http scheme', () => {
    const r = validateCustomDomain('http://example.com')
    expect(r.ok).toBe(false)
  })

  it('rejects URL with path', () => {
    const r = validateCustomDomain('example.com/path')
    expect(r.ok).toBe(false)
  })

  it('rejects URL with port', () => {
    const r = validateCustomDomain('example.com:8080')
    expect(r.ok).toBe(false)
  })

  it('rejects user-info', () => {
    const r = validateCustomDomain('user@example.com')
    expect(r.ok).toBe(false)
  })

  it('rejects whitespace inside', () => {
    const r = validateCustomDomain('exa mple.com')
    expect(r.ok).toBe(false)
  })

  it('rejects bare hostname (no TLD)', () => {
    const r = validateCustomDomain('localhost')
    expect(r.ok).toBe(false)
  })

  it('rejects leading dot', () => {
    const r = validateCustomDomain('.example.com')
    expect(r.ok).toBe(false)
  })

  it('rejects trailing dot', () => {
    const r = validateCustomDomain('example.com.')
    expect(r.ok).toBe(false)
  })

  it('rejects consecutive dots', () => {
    const r = validateCustomDomain('foo..example.com')
    expect(r.ok).toBe(false)
  })

  it('rejects IPv4 address', () => {
    const r = validateCustomDomain('192.168.1.1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.toLowerCase()).toContain('ip')
  })

  it('rejects label starting with hyphen', () => {
    const r = validateCustomDomain('-foo.example.com')
    expect(r.ok).toBe(false)
  })

  it('rejects label ending with hyphen', () => {
    const r = validateCustomDomain('foo-.example.com')
    expect(r.ok).toBe(false)
  })

  it('rejects underscore in label', () => {
    const r = validateCustomDomain('foo_bar.example.com')
    expect(r.ok).toBe(false)
  })

  it('rejects non-ASCII / IDN (punycode must be supplied instead)', () => {
    const r = validateCustomDomain('münchen.de')
    expect(r.ok).toBe(false)
  })

  it('rejects label longer than 63 chars', () => {
    const tooLong = 'a'.repeat(64)
    const r = validateCustomDomain(`${tooLong}.com`)
    expect(r.ok).toBe(false)
  })

  it('rejects total length over 253 chars', () => {
    // 4 labels of 60 + 3 separators + ".com" = 244 + ".aaaa..."
    // Build a 260-char domain.
    const huge = `${'a'.repeat(60)}.${'b'.repeat(60)}.${'c'.repeat(60)}.${'d'.repeat(60)}.example.com`
    expect(huge.length).toBeGreaterThan(253)
    const r = validateCustomDomain(huge)
    expect(r.ok).toBe(false)
  })

  it('rejects pure-numeric TLD', () => {
    const r = validateCustomDomain('foo.123')
    expect(r.ok).toBe(false)
  })

  it('rejects backslash', () => {
    const r = validateCustomDomain('foo\\bar.com')
    expect(r.ok).toBe(false)
  })

  it('rejects query string', () => {
    const r = validateCustomDomain('example.com?x=1')
    expect(r.ok).toBe(false)
  })

  it('rejects fragment', () => {
    const r = validateCustomDomain('example.com#frag')
    expect(r.ok).toBe(false)
  })

  it('rejects label with special punctuation', () => {
    const r = validateCustomDomain('foo!bar.com')
    expect(r.ok).toBe(false)
  })
})
