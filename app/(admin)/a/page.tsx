import { requireSession } from '@/lib/auth/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminDashboard() {
  const session = await requireSession()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Bienvenido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{session.profile.fullName}</p>
            <p className="text-sm text-muted-foreground">{session.roles.join(', ')}</p>
          </CardContent>
        </Card>
        {session.permissions.has('users:read') && (
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
              <a href="/a/users" className="text-primary hover:underline">
                Gestionar usuarios
              </a>
            </CardContent>
          </Card>
        )}
        {session.permissions.has('tenants:write') && (
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Tenants</CardTitle>
            </CardHeader>
            <CardContent>
              <a href="/a/tenants" className="text-primary hover:underline">
                Gestionar tenants
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
