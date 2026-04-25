# Spec 02 — Autenticación y RBAC

## Autenticación

### Proveedor
Supabase Auth (email/password + TOTP 2FA).

### Flujos

#### Login
1. Usuario ingresa email + password en `/login`.
2. Server Action llama `supabase.auth.signInWithPassword`.
3. Si el usuario tiene 2FA activo → redirige a `/login/2fa` para ingresar código TOTP.
4. Si el usuario tiene 2FA obligatorio (admin/teacher) pero no lo ha configurado → redirige a `/onboarding/2fa` antes de acceder a cualquier recurso.
5. Al éxito: se escribe cookie de sesión, se registra evento en `auth_events`, redirige al portal correspondiente según rol activo.

#### Activación de cuenta (invitación)
1. Admin crea usuario; sistema genera token de invitación (Supabase).
2. Email con link único: `/activate?token=...`.
3. Usuario configura password y (si corresponde) 2FA.
4. Queda activo.

#### Reset de password
1. `/forgot-password` → ingresa email.
2. Supabase envía magic link.
3. `/reset-password?token=...` → nuevo password.
4. Se invalidan todas las sesiones previas del usuario.

#### Logout
1. Cierra sesión Supabase.
2. Borra cookie.
3. Registra `auth_events`.
4. Redirige a `/login`.

### Rate limiting
- Login: 5 intentos fallidos / 10 min por IP + email.
- Reset password: 3 solicitudes / hora por email.
- Invitaciones: 50 / hora por tenant.

Implementación sugerida: Upstash Redis (o tabla Postgres con cleanup job si no queremos otra dependencia).

### 2FA
- TOTP (compatible con Google Authenticator, Authy, 1Password).
- Obligatorio para: `super_admin`, `admin`, `coordinator`, `treasurer`, `teacher`.
- Opcional para: `student`.
- Recovery codes: 10 códigos de un solo uso al activar 2FA.
- Si usuario pierde acceso, solo `super_admin` puede resetear 2FA → queda en audit log.

---

## RBAC

### Modelo
- **Roles** agrupan permisos.
- **Permisos** son strings con formato `resource:action` o `resource:action:scope`.
- Un usuario tiene uno o más roles por tenant.
- El rol activo determina el portal y los menús visibles.

### Permisos base (se siembran en migration)

**Académico:**
- `programs:read`, `programs:write`
- `subjects:read`, `subjects:write`
- `courses:read`, `courses:read:own` (solo cursos donde es profesor), `courses:write`
- `enrollments:read`, `enrollments:write`
- `grades:read`, `grades:read:own` (solo propias / de sus cursos), `grades:write`, `grades:publish`

**Financiero:**
- `concepts:read`, `concepts:write`
- `charges:read`, `charges:write`
- `payments:read`, `payments:read:own`, `payments:write`
- `receipts:read`, `receipts:generate`

**Administrativo:**
- `users:read`, `users:write`, `users:invite`
- `roles:read`, `roles:write`
- `tenants:read`, `tenants:write`
- `audit:read`
- `reports:read`, `reports:export`

**Sistema:**
- `notifications:send:broadcast`

### Mapeo por defecto rol → permisos

| Permiso | super_admin | admin | coord. | treasurer | teacher | student |
|---|---|---|---|---|---|---|
| programs:read | ✓ | ✓ | ✓ | ✓ | ✓ | |
| programs:write | ✓ | ✓ | ✓ | | | |
| courses:read | ✓ | ✓ | ✓ | | | |
| courses:read:own | | | | | ✓ | ✓ |
| courses:write | ✓ | ✓ | ✓ | | | |
| grades:read | ✓ | ✓ | ✓ | | | |
| grades:read:own | | | | | ✓ | ✓ |
| grades:write | | | | | ✓ | |
| grades:publish | | | | | ✓ | |
| charges:write | ✓ | ✓ | | ✓ | | |
| payments:read | ✓ | ✓ | | ✓ | | |
| payments:read:own | | | | | | ✓ |
| payments:write | ✓ | ✓ | | ✓ | | |
| receipts:generate | ✓ | ✓ | | ✓ | | |
| users:read | ✓ | ✓ | ✓ | ✓ | | |
| users:write | ✓ | ✓ | | | | |
| users:invite | ✓ | ✓ | | | | |
| roles:write | ✓ | | | | | |
| audit:read | ✓ | ✓ | | | | |
| reports:read | ✓ | ✓ | ✓ | ✓ | | |
| reports:export | ✓ | ✓ | | ✓ | | |

(Se siembran en `supabase/seed.sql` durante la migración inicial.)

### Chequeos en código

**Helper:**
```ts
// lib/auth/permissions.ts
export async function can(
  permission: string,
  resource?: { tenantId?: string; ownerId?: string }
): Promise<boolean>
```

**Uso en Server Action:**
```ts
if (!(await can('grades:write', { tenantId, courseId }))) {
  throw new ForbiddenError()
}
```

**Middleware:** redirecciona según rol activo.

**RLS:** política por tabla basada en función `public.has_permission(permission_code text)` que consulta `user_roles` + `role_permissions`.

### Cambio de rol activo
Un usuario con múltiples roles ve un switcher en la topbar. Al cambiar, se actualiza un claim custom en el JWT y se redirige al portal correspondiente.

---

## Middleware de Next.js

```
/login, /activate, /forgot-password → públicos
/s/*  → requiere rol student (o superior con student switching)
/t/*  → requiere rol teacher o superior
/a/*  → requiere rol admin+ (admin, coordinator, treasurer, super_admin)
/     → redirige al portal del rol activo
```

Si un usuario accede a ruta no permitida: 403, no 404.

---

## Decisiones fijas
- No hay auto-registro público. Todas las cuentas se crean por invitación de admin.
- No hay "social login" (Google, etc.) en MVP.
- Sesión expira a las 12h de inactividad. Refresh automático.
- Passwords: mínimo 10 caracteres, al menos 1 letra y 1 número (validación Zod).
- Todos los eventos auth van a `auth_events` sin excepción.
