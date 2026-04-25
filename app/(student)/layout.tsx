export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="glass-subtle border-b px-6 py-4">
        <span className="text-sm font-medium text-muted-foreground">Portal Estudiante</span>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
