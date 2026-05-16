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
      <head>
        {/*
          BrandProvider injects per-tenant CSS variables and the tenant favicon
          before children render — avoiding FOUC. Apex/unknown hosts emit
          nothing and the default theme from globals.css applies. ThemeProvider
          (dark/light toggle) is a separate concern and wraps the tree below.
        */}
        <BrandProvider />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
