import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = {
  title: 'Institución no encontrada',
}

export default function NotFoundSubdomainPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Institución no encontrada</CardTitle>
          <CardDescription>
            Esta institución no existe o no está activa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Verifica la dirección o regresa al sitio principal.
          </p>
          <div className="mt-6">
            <Link
              href="https://creadigitalagency.com"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Ir al sitio principal
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
