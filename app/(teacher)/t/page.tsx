import { requireSession } from '@/lib/auth/session'

export default async function TeacherDashboard() {
  const session = await requireSession()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Bienvenido, {session.profile.fullName}</h1>
      <p className="text-muted-foreground">
        No tienes cursos asignados aun. Esto se habilitara en la siguiente fase.
      </p>
    </div>
  )
}
