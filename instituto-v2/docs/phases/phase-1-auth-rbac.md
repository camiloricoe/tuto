# Fase 1 — Auth + RBAC

**Objetivo**: usuarios pueden crearse por invitación, loguearse con 2FA, tener roles configurables, y ver el portal correspondiente a su rol.

**Branch**: `phase/1-auth-rbac`
**Duración estimada**: 1-2 días
**Specs a leer**: `/docs/specs/02-auth-and-rbac.md`, `/docs/specs/09-security-and-rls.md`

---

## Resultado esperado al final

Un super_admin puede:
1. Hacer login con email + password + 2FA
2. Crear un tenant
3. Invitar a un admin al tenant
4. El admin recibe email, activa cuenta, configura 2FA
5. El admin invita a un teacher y a un student
6. Cada uno recibe email, activa cuenta
7. Al hacer login, cada usuario va al portal correspondiente (`/s/*`, `/t/*`, `/a/*`)
8. Intentar entrar a un portal no autorizado → 403
9. Todo queda en `auth_events` y `activity_log`

---

## Migraciones SQL (en orden)

### `YYYYMMDDHHMMSS_01_tenants.sql`
- Crear tabla `tenants`
- RLS habilitado
- Políticas: todos los autenticados pueden leer los tenants donde son miembros (necesita la tabla siguiente)

### `YYYYMMDDHHMMSS_02_user_profiles.sql`
- Crear tabla `user_profiles`
- Trigger: al crear usuario en `auth.users`, crear fila en `user_profiles` automáticamente
- RLS: usuario solo puede leer/editar su propio perfil; admins de un tenant pueden leer perfiles de usuarios del tenant

### `YYYYMMDDHHMMSS_03_memberships.sql`
- Crear tabla `user_tenant_memberships`
- RLS

### `YYYYMMDDHHMMSS_04_rbac_catalog.sql`
- Crear tablas: `roles_catalog`, `permissions`
- Seed inmediato en la misma migración con los permisos y roles base del spec 02
- RLS: lectura pública (autenticados), escritura solo super_admin

### `YYYYMMDDHHMMSS_05_rbac_tenant.sql`
- Crear tablas: `roles`, `role_permissions`, `user_roles`
- RLS según spec 09

### `YYYYMMDDHHMMSS_06_rbac_functions.sql`
- Crear funciones helper: `auth.uid()`, `auth.user_tenants()`, `auth.has_permission()`
- Ver spec 09 sección "Funciones helper en Postgres"

### `YYYYMMDDHHMMSS_07_audit_context.sql`
- Crear función `public.set_audit_context(user_id, ip, user_agent)`

### `YYYYMMDDHHMMSS_08_auth_events.sql`
- Crear tabla `auth_events`
- RLS: lectura solo con permiso `audit:read`, escritura desde Server Actions

### `YYYYMMDDHHMMSS_09_activity_log.sql`
- Crear tabla `activity_log`
- RLS: lectura con `audit:read` del tenant; escritura desde Server Actions

### `YYYYMMDDHHMMSS_10_user_roles_audit.sql`
- Crear tabla `user_roles_audit`
- Trigger genérico `audit.log_changes()` (crear la función genérica)
- Aplicar trigger a `user_roles` y `user_profiles`

### `YYYYMMDDHHMMSS_11_initial_seed.sql`
- Seed del role assignment inicial:
  - Un super_admin hardcodeado con email desde env var `INITIAL_SUPER_ADMIN_EMAIL`
  - Password temporal aleatoria → se envía por email al hacer deploy inicial
  - **Solo corre si no existe super_admin** (idempotente)

---

## Archivos de aplicación

### `lib/env.ts`
Ya existe de fase 0. Agregar:
- `INITIAL_SUPER_ADMIN_EMAIL`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (si aplica)

### `lib/supabase/*`
Ajustar `server.ts` para que al crear el cliente, setee `set_audit_context` con user_id, IP y user_agent.

### `lib/auth/session.ts`

```ts
export async function getSession(): Promise<Session | null>
export async function requireSession(): Promise<Session>  // lanza si no hay
export async function getCurrentTenant(): Promise<Tenant | null>
```

La `Session` incluye: `userId`, `email`, `profile`, `activeTenantId`, `roles` (array), `permissions` (set).

### `lib/auth/permissions.ts`

```ts
export async function can(
  permission: string,
  resource?: { tenantId?: string; resourceId?: string }
): Promise<boolean>

export async function requirePermission(
  permission: string,
  resource?: { tenantId?: string; resourceId?: string }
): Promise<void>  // lanza ForbiddenError si no
```

### `lib/auth/errors.ts`
```ts
export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}
export class TooManyRequestsError extends Error {}
```

### `lib/auth/rate-limit.ts`

Implementación según decisión de Bootstrap (Upstash o Postgres). Exportar:
```ts
export const loginLimiter: RateLimiter
export const forgotPasswordLimiter: RateLimiter
export const resetPasswordLimiter: RateLimiter
export const inviteLimiter: RateLimiter
```

Cada uno con método `async limit(key: string): Promise<{ success: boolean }>`.

### `lib/audit/activity.ts`

```ts
export async function logActivity(params: {
  tenantId: string
  actorUserId: string
  actionCode: string
  resourceType: string
  resourceId: string
  summary: string
  metadata?: Record<string, unknown>
}): Promise<void>

export async function logAuthEvent(params: {
  userId?: string | null
  event: AuthEventType
  metadata?: Record<string, unknown>
}): Promise<void>
```

### `lib/email/templates/account-invitation.tsx`
Template React Email para invitación inicial.

### `lib/email/send.ts`
```ts
export async function sendEmail(params: {
  to: string
  templateCode: string
  props: Record<string, unknown>
  tenantId?: string
}): Promise<void>
```

Internamente:
1. Renderiza template
2. Inserta en `email_deliveries` con status `queued`
3. Llama Resend
4. Actualiza status con result

### `middleware.ts`

Implementar según spec 02 sección "Middleware de Next.js":
- Refresh de sesión
- Rutas públicas / protegidas
- Redirect por rol activo
- Cabeceras de seguridad
- CSP

### Rutas

#### `app/(auth)/login/page.tsx`
- Form con email + password
- Server Action `loginAction`
- Rate limit 5/10min
- Si user tiene 2FA → redirect a `/login/2fa`
- Si user tiene 2FA obligatorio no configurado → redirect a `/onboarding/2fa`
- Log `auth_events` en ambos casos (success/failure)

#### `app/(auth)/login/2fa/page.tsx`
- Form con código TOTP de 6 dígitos
- Server Action valida contra secret
- Si OK → setea sesión completa + redirect a portal según rol

#### `app/(auth)/onboarding/2fa/page.tsx`
- Muestra QR code + secret manual
- Input de código para verificar
- Al verificar: genera 10 recovery codes, los muestra una sola vez, obliga a user a confirmar que los guardó

#### `app/(auth)/activate/page.tsx`
- Recibe token
- Form: setear password
- Si el rol requiere 2FA → redirige a setup después

#### `app/(auth)/forgot-password/page.tsx`
#### `app/(auth)/reset-password/page.tsx`

#### `app/(student)/layout.tsx`, `app/(teacher)/layout.tsx`, `app/(admin)/layout.tsx`
- Layout con sidebar mínima
- Topbar con:
  - Nombre del app
  - Tenant switcher (si user tiene múltiples)
  - Role switcher (si user tiene múltiples roles en el tenant actual)
  - Avatar + menú con logout
- Contenido es placeholder "Bienvenido al portal X"

#### `app/(admin)/a/tenants/page.tsx` (solo super_admin)
Listado y creación de tenants. Muy básico.

#### `app/(admin)/a/users/page.tsx`
Listado de usuarios del tenant actual.

#### `app/(admin)/a/users/new/page.tsx`
Form para invitar usuario:
- Email, nombre, rol a asignar
- Submit → crea user en auth.users con password aleatoria, genera link de invitación, envía email

### Server Actions principales

`app/actions/auth.ts`:
- `loginAction(email, password)`
- `verifyTotpAction(code)`
- `setupTotpAction(code)`
- `logoutAction()`
- `forgotPasswordAction(email)`
- `resetPasswordAction(token, newPassword)`

`app/actions/users.ts`:
- `inviteUserAction(input)` — requiere permiso `users:invite`
- `activateAccountAction(token, password)` — público pero con token

`app/actions/tenants.ts`:
- `createTenantAction(input)` — solo super_admin
- `switchActiveTenantAction(tenantId)`

`app/actions/roles.ts`:
- `assignRoleAction(userId, roleId)` — permiso `users:write`
- `revokeRoleAction(userRoleId)` — permiso `users:write`

Todas siguen el patrón del spec 09: `requireSession` → validar Zod → `requirePermission` → transacción → `logActivity`.

### Tests

#### Unit tests

- `tests/unit/auth/rate-limit.test.ts`: límites funcionan
- `tests/unit/auth/permissions.test.ts`: can() con scope, requirePermission lanza

#### Integration tests

- `tests/integration/rls/tenant-isolation.test.ts`: user de tenant A no ve tenant B
- `tests/integration/rls/user-profiles-rls.test.ts`: user lee solo su perfil (o de su tenant como admin)
- `tests/integration/actions/invite-user.test.ts`: flujo completo de invitación
- `tests/integration/actions/activate-account.test.ts`: activación con token
- `tests/integration/audit/auth-events.test.ts`: login success/failure quedan en auth_events
- `tests/integration/audit/user-roles-audit.test.ts`: trigger de audit dispara

#### E2E tests

- `tests/e2e/login.spec.ts`: flujo feliz + 2FA
- `tests/e2e/activation.spec.ts`: flujo de invitación + activación
- `tests/e2e/portal-routing.spec.ts`: cada rol va al portal correcto

---

## Criterios de done

### Funcionales
- [ ] Super_admin puede loguearse con credenciales del seed
- [ ] Super_admin puede crear un tenant
- [ ] Super_admin puede invitar a un admin (usuario recibe email)
- [ ] Admin puede activar cuenta, configurar 2FA, loguearse
- [ ] Admin puede invitar a teacher y student
- [ ] Cada rol al loguearse va a su portal
- [ ] 2FA obligatorio para admin/teacher funciona
- [ ] 2FA opcional para student funciona
- [ ] Reset de password funciona
- [ ] Rate limiting en login funciona (6to intento falla)
- [ ] User de tenant A no ve nada de tenant B

### Técnicos
- [ ] `pnpm typecheck && pnpm lint && pnpm test` pasa
- [ ] Cobertura `lib/auth/**` > 80%
- [ ] RLS habilitada en todas las tablas nuevas (query de verificación)
- [ ] Cabeceras de seguridad aplicadas en middleware (test manual con curl)
- [ ] CSP sin `unsafe-eval`
- [ ] Audit context se setea en cada request (verificable: un update en `user_profiles` deja `changed_by` correcto)
- [ ] Activity log se escribe en login, invite, activation
- [ ] Auth events se escriben en todos los eventos

### Documentación
- [ ] PR description completa con lista de decisiones y screenshots
- [ ] TECH_DEBT.md actualizado si hay shortcuts
- [ ] `/docs/phases/00-roadmap.md` actualizado con link al PR

---

## Deuda técnica esperable en esta fase

Cosas que probablemente quedan para después (anotar en TECH_DEBT.md):
- UI de tenant switcher: al inicio solo selector básico, sin animaciones
- Manejo avanzado de sesión (multi-dispositivo, session inspector): no en MVP
- Recovery codes: UI mínima en MVP, mejorable
- Password reset: flujo básico, sin detección de passwords comprometidas (haveibeenpwned) — Fase 2

---

## Notas

- **No implementar módulo académico aún.** Esto es fase 2.
- **No crear tablas de grades/payments.** Esto es fase 3 y 4.
- La UI de admin en esta fase es mínima — solo lo necesario para probar el flujo (crear tenant, invitar usuarios).
- Los portales de student/teacher son layouts vacíos con mensaje "No tienes cursos asignados aún" — se llenan en fase 2+.
