'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="es">
      <body>
        <main className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold">Algo salio mal</h2>
            <button
              className="mt-4 rounded-lg bg-primary px-6 py-2 text-primary-foreground"
              onClick={() => reset()}
            >
              Intentar de nuevo
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
