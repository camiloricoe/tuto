export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="glass rounded-xl px-12 py-10 text-center">
        <h1 className="text-5xl font-semibold tracking-tight text-foreground">TUTO</h1>
        <p className="mt-3 text-lg text-muted-foreground">Sistema de gestion academica</p>
        <div className="mt-6">
          <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Fase 0 — Bootstrap
          </span>
        </div>
      </div>
    </main>
  )
}
