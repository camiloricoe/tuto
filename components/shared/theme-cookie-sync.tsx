'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'

/**
 * Mirrors next-themes' resolved theme to a non-httpOnly cookie (`tuto-theme`)
 * so the server can read it on every navigation and render the correct
 * `<html className="dark">` from the first byte. This eliminates the FOUC
 * race between the inline next-themes script and React hydration that was
 * resetting the user's theme on streaming RSC navigations.
 *
 * Renders nothing.
 */
export function ThemeCookieSync() {
  const { theme, resolvedTheme } = useTheme()

  useEffect(() => {
    if (typeof document === 'undefined') return
    // Persist the user's explicit choice when it's "system" so the server
    // knows to fall back to system on the next request, otherwise persist
    // the resolved value (light/dark) so the server can render the class.
    const value = theme === 'system' ? 'system' : (resolvedTheme ?? theme ?? 'system')
    document.cookie = `tuto-theme=${value}; path=/; max-age=31536000; samesite=lax`
  }, [theme, resolvedTheme])

  return null
}
