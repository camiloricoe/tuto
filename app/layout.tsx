import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/shared/theme-provider'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
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
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
