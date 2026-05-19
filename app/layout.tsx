import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cookies } from 'next/headers'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/shared/theme-provider'
import { ThemeCookieSync } from '@/components/shared/theme-cookie-sync'
import { BrandProvider } from '@/components/brand/brand-provider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: {
    default: 'TUTO',
    template: '%s | TUTO',
  },
  description: 'Sistema de gestion academica',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read the theme cookie server-side so we can render `<html className="dark">`
  // from the first byte. This eliminates the FOUC race between next-themes'
  // inline script and React hydration on streaming RSC navigations that was
  // resetting the user's theme on every page change.
  const cookieStore = await cookies()
  const themeCookie = cookieStore.get('tuto-theme')?.value
  const htmlClassName =
    themeCookie === 'dark' ? `${inter.variable} dark` : inter.variable

  return (
    <html lang="es" className={htmlClassName} suppressHydrationWarning>
      <body>
        {/*
          BrandProvider renders as the first body child (instead of in <head>)
          so React doesn't reconcile <head> children — head reconciliation was
          racing with next-themes' FOUC-prevention script and resetting the
          user's saved theme on every navigation. CSS vars in body-rendered
          <style> apply globally just the same; favicon <link> is also accepted
          in body by modern browsers.
        */}
        <BrandProvider />
        <ThemeProvider defaultTheme={themeCookie ?? 'system'}>
          {children}
          <ThemeCookieSync />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
