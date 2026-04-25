# Spec 09 — Seguridad y Row Level Security

## Principios

1. **Defense in depth**: cada petición pasa por 3 capas de autorización (middleware, server action, RLS). Si una falla, las otras atrapan el problema.
2. **Least privilege**: cada rol tiene solo los permisos estrictamente necesarios.
3. **Trust nothing from client**: todo input se valida con Zod; tenant_id y user_id se derivan del servidor.
4. **Auditability**: operaciones sensibles dejan registro en audit y activity log.
5. **Fail secure**: ante duda, denegar acceso.

---

## Capa 1: Middleware de Next.js

Archivo: `middleware.ts` en la raíz.

### Responsabilidades
1. Leer sesión de Supabase Auth desde cookies
2. Refrescar token si es necesario
3. Redireccionar rutas públicas vs privadas
4. Redireccionar según portal (`/s/*`, `/t/*`, `/a/*`)
5. Bloquear acceso si falta 2FA obligatorio
6. Setear cabeceras de seguridad

### Ruteo por portal

```
Ruta               | Permite
-------------------|-------------------------------
/                  | Redirect según rol activo
/login/*           | Público
/activate/*        | Público (con token)
/forgot-password/* | Público
/reset-password/*  | Público (con token)
/s/*               | Rol con permiso student
/t/*               | Rol con permiso teacher o superior
/a/*               | Rol admin+ (admin, coordinator, treasurer, super_admin)
/api/*             | Variable por endpoint
```

### Cabeceras de seguridad

```ts
// Aplicadas a todas las respuestas
{
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': /* definido en siguiente sección */
}
```

### Content Security Policy

```
default-src 'self';
script-src 'self' 'nonce-<random>';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https://<project>.supabase.co;
connect-src 'self' https://<project>.supabase.co wss://<project>.supabase.co;
font-src 'self';
frame-ancestors 'none';
```

Ajustar `<project>` al URL real de Supabase.

---

## Capa 2: Server Actions

### Patrón estándar

```ts
// Toda Server Action empieza así
export async function publishGrades(input: PublishGradesInput) {
  // 1. Obtener sesión del servidor (NUNCA del cliente)
  const session = await requireSession()

  // 2. Validar input con Zod
  const data = publishGradesSchema.parse(input)

  // 3. Verificar permiso
  await requirePermission('grades:publish', {
    tenantId: session.tenantId,
    resourceId: data.courseId,
  })

  // 4. Ejecutar lógica en transacción
  return db.transaction(async (tx) => {
    // ... operación
    // 5. Log de actividad al final
    await logActivity(tx, {
      actionCode: 'grade.published',
      resourceType: 'course',
      resourceId: data.courseId,
      summary: `Publicadas ${n} notas del curso ${courseName}`,
    })
  })
}
```

### Helpers obligatorios

#### `requireSession()`
- Devuelve `{ userId, tenantId, roles, permissions }` o lanza `UnauthorizedError`
- Setea contexto de audit (`app.user_id`, `app.ip`, `app.user_agent`) en la conexión DB

#### `requirePermission(code, resource?)`
- Verifica que la sesión tenga el permiso
- Para permisos con scope (`grades:read:own`), valida también el recurso
- Lanza `ForbiddenError` si no cumple

#### `requireTenantAccess(tenantId)`
- Verifica que el usuario pertenece a ese tenant
- Necesario cuando se opera sobre múltiples tenants (super_admin)

---

## Capa 3: Row Level Security

### Configuración base

Todas las tablas tienen RLS habilitado. Ninguna excepción.

```sql
ALTER TABLE nombre_tabla ENABLE ROW LEVEL SECURITY;
ALTER TABLE nombre_tabla FORCE ROW LEVEL SECURITY;  -- fuerza RLS incluso al owner
```

### Funciones helper en Postgres

```sql
-- Retorna el user_id del JWT
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$ LANGUAGE sql STABLE;

-- Retorna los tenant_ids a los que pertenece el usuario
CREATE OR REPLACE FUNCTION auth.user_tenants() RETURNS setof uuid AS $$
  SELECT tenant_id FROM user_tenant_memberships
  WHERE user_id = auth.uid() AND active = true
$$ LANGUAGE sql STABLE;

-- Retorna true si el usuario tiene el permiso en el tenant
CREATE OR REPLACE FUNCTION auth.has_permission(
  p_permission text,
  p_tenant_id uuid DEFAULT NULL
) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND ur.revoked_at IS NULL
      AND (p_tenant_id IS NULL OR ur.tenant_id = p_tenant_id)
      AND p.code = p_permission
  )
$$ LANGUAGE sql STABLE;

-- Retorna true si el usuario es el propio estudiante (para scope :own)
CREATE OR REPLACE FUNCTION auth.is_self(p_user_id uuid) RETURNS boolean AS $$
  SELECT auth.uid() = p_user_id
$$ LANGUAGE sql STABLE;
```

### Patrones de políticas RLS

#### Pattern A: Tenant isolation

Para tablas de dominio que pertenecen a un tenant:

```sql
-- SELECT: el usuario pertenece al tenant Y tiene permiso
CREATE POLICY "select_if_tenant_member_and_has_permission"
  ON academic_programs FOR SELECT
  USING (
    tenant_id IN (SELECT auth.user_tenants())
    AND auth.has_permission('programs:read', tenant_id)
  );

-- INSERT: el usuario pertenece al tenant Y tiene permiso de escritura
CREATE POLICY "insert_if_tenant_member_and_has_permission"
  ON academic_programs FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT auth.user_tenants())
    AND auth.has_permission('programs:write', tenant_id)
  );

-- UPDATE: mismo criterio, both USING y WITH CHECK
CREATE POLICY "update_if_tenant_member_and_has_permission"
  ON academic_programs FOR UPDATE
  USING (
    tenant_id IN (SELECT auth.user_tenants())
    AND auth.has_permission('programs:write', tenant_id)
  )
  WITH CHECK (
    tenant_id IN (SELECT auth.user_tenants())
    AND auth.has_permission('programs:write', tenant_id)
  );

-- DELETE: soft delete es un UPDATE en la práctica
-- Pero si se permite delete físico (raro en dominio), mismo patrón
```

#### Pattern B: Resource ownership (scope `:own`)

Para datos que tienen un "owner" (ej: notas de un estudiante, pagos de un estudiante):

```sql
-- Estudiante lee sus propias notas, O profesor lee notas de sus cursos,
-- O staff con permiso general las lee todas
CREATE POLICY "select_grades_own_or_course_teacher_or_admin"
  ON grades FOR SELECT
  USING (
    tenant_id IN (SELECT auth.user_tenants())
    AND (
      -- Staff administrativo
      auth.has_permission('grades:read', tenant_id)
      -- Profesor del curso
      OR EXISTS (
        SELECT 1 FROM enrollments e
        JOIN courses c ON c.id = e.course_id
        WHERE e.id = grades.enrollment_id
          AND c.teacher_id = auth.uid()
          AND auth.has_permission('grades:read:own', tenant_id)
      )
      -- Estudiante dueño de la nota (solo si está publicada)
      OR (
        status = 'published'
        AND EXISTS (
          SELECT 1 FROM enrollments e
          WHERE e.id = grades.enrollment_id
            AND e.student_id = auth.uid()
            AND auth.has_permission('grades:read:own', tenant_id)
        )
      )
    )
  );
```

#### Pattern C: Write solo del asignado

```sql
-- Profesor escribe notas solo de sus cursos
CREATE POLICY "insert_grades_only_teacher_of_course"
  ON grades FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT auth.user_tenants())
    AND auth.has_permission('grades:write', tenant_id)
    AND EXISTS (
      SELECT 1 FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.id = enrollment_id
        AND c.teacher_id = auth.uid()
    )
  );
```

#### Pattern D: Catálogos globales

Para `permissions`, `roles_catalog`:

```sql
-- Todos los autenticados pueden leer
CREATE POLICY "select_all_authenticated"
  ON permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo super_admin puede modificar
CREATE POLICY "insert_super_admin_only"
  ON permissions FOR INSERT
  WITH CHECK (auth.has_permission('system:manage', NULL));
```

#### Pattern E: Audit tables

```sql
-- Solo lectura, y solo con permiso audit:read
ALTER TABLE grades_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_audit_with_permission"
  ON grades_audit FOR SELECT
  USING (
    -- Derivar tenant_id del row original o de la data
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND auth.has_permission('audit:read', ur.tenant_id)
    )
  );

-- INSERT solo desde trigger (SECURITY DEFINER), sin políticas normales
-- UPDATE y DELETE jamás permitidos
-- No hay política de UPDATE/DELETE → implícitamente denegado
```

---

## Setting del contexto de audit

Cada request debe setear el contexto al inicio, para que los triggers capturen quién hizo qué.

### Función Postgres

```sql
CREATE OR REPLACE FUNCTION public.set_audit_context(
  p_user_id uuid,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  PERFORM set_config('app.user_id', COALESCE(p_user_id::text, ''), true);
  PERFORM set_config('app.ip', COALESCE(p_ip, ''), true);
  PERFORM set_config('app.user_agent', COALESCE(p_user_agent, ''), true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Uso desde la app

```ts
// lib/supabase/server.ts
export async function createServerClient(request: NextRequest) {
  const client = createClient(...)
  const { data: { user } } = await client.auth.getUser()
  if (user) {
    await client.rpc('set_audit_context', {
      p_user_id: user.id,
      p_ip: request.headers.get('x-forwarded-for')?.split(',')[0] ?? null,
      p_user_agent: request.headers.get('user-agent') ?? null,
    })
  }
  return client
}
```

---

## Rate limiting

### Endpoints con rate limit

| Endpoint | Límite | Scope |
|---|---|---|
| `POST /login` | 5/10min | IP + email |
| `POST /forgot-password` | 3/hora | email |
| `POST /reset-password` | 5/hora | IP |
| `POST /activate` | 10/hora | token |
| Invite user | 50/hora | tenant |
| Export generation | 10/hora | user |
| PDF generation | 30/hora | user |

### Implementación

**Opción A (recomendada)**: Upstash Redis + `@upstash/ratelimit`.

```ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const loginRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '10 m'),
})

// Uso
const { success } = await loginRatelimit.limit(`login:${ip}:${email}`)
if (!success) throw new TooManyRequestsError()
```

**Opción B (si no querés dependencia extra)**: tabla Postgres con `INSERT + COUNT` por ventana + cleanup job.

```sql
CREATE TABLE rate_limit_hits (
  id bigserial PRIMARY KEY,
  key text NOT NULL,
  hit_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON rate_limit_hits (key, hit_at);

-- Función que valida límite
CREATE FUNCTION check_rate_limit(p_key text, p_max int, p_window interval)
RETURNS boolean AS $$
  INSERT INTO rate_limit_hits (key) VALUES (p_key);
  SELECT COUNT(*) <= p_max FROM rate_limit_hits
  WHERE key = p_key AND hit_at > now() - p_window;
$$ LANGUAGE sql;
```

Opción A es mejor por performance y simplicidad. Decidir en Bootstrap.

---

## Autenticación: reglas específicas

### Passwords

Validación (Zod):
- Mínimo 10 caracteres
- Al menos 1 letra y 1 número
- Comparar contra lista de top-1000 passwords comunes (librería `zxcvbn` o similar)
- **Nunca** guardar en logs, audit, o texto plano

### 2FA

- TOTP con `speakeasy` o Supabase Auth native 2FA
- Secret se encripta con key rotatable (clave en env var)
- 10 recovery codes de un solo uso al habilitar
- Recovery codes se hashean (bcrypt) antes de guardar
- Reset de 2FA requiere super_admin + razón + queda en audit

### Sesiones

- Cookie httpOnly, sameSite=lax, secure en producción
- Expiración: 12 horas de inactividad
- Refresh automático mientras haya actividad
- `POST /logout` invalida la sesión server-side

### Brute force

- Después de 5 intentos fallidos → backoff exponencial (1min, 2min, 4min...)
- Después de 10 intentos fallidos en 1h → bloquear cuenta 30 min + notificar usuario por email

---

## Data sensible

### Clasificación

| Tipo | Ejemplos | Tratamiento |
|---|---|---|
| **Público** | Nombres de cursos, catálogos | Sin restricción especial |
| **Interno** | Listas de estudiantes | RLS por tenant |
| **Confidencial** | Notas, pagos | RLS por tenant + scope |
| **PII sensible** | Documentos de identidad, contactos | RLS + cifrado en columnas específicas si aplica |
| **Credenciales** | Passwords, tokens, 2FA secrets | Nunca en logs, cifradas en reposo |

### Storage

- Comprobantes de pago: bucket `payment-proofs`, policies que limitan acceso por RLS
- Recibos PDF: bucket `receipts`, URLs firmadas de corta duración (1 hora)
- Boletines: no se almacenan (se generan on-demand)

### Privacy

- Tenant puede configurar "anonimizar IP" → reemplaza último octeto en audit
- Borrado de cuenta (GDPR-style): Fase 2+, no MVP

---

## Tests de seguridad obligatorios

### Tests de RLS (crítico)

Para cada tabla, al menos:
1. Usuario de tenant A **no puede** leer filas de tenant B
2. Estudiante **no puede** leer notas de otro estudiante
3. Estudiante **no puede** escribir notas
4. Profesor **no puede** escribir notas de curso que no le fue asignado
5. Treasurer **puede** leer pagos pero **no puede** escribir notas
6. Super_admin **puede** todo

### Tests de autenticación

1. Login con credenciales válidas → cookie de sesión + redirect correcto
2. Login con password incorrecto → error + log en `auth_events`
3. Rate limiting de login → 6to intento falla con 429
4. 2FA obligatorio: user sin 2FA configurado → redirect a setup
5. Sesión expirada → redirect a login
6. Logout → cookie borrada

### Tests de autorización

1. Request a `/a/*` con rol student → 403
2. Server Action con permiso faltante → `ForbiddenError`
3. Middleware bloquea rutas no autorizadas

---

## Checklist de hardening (Fase 5)

- [ ] Todos los Server Actions validan input con Zod
- [ ] Todos los Server Actions llaman `requireSession()` y `requirePermission()`
- [ ] RLS habilitada en 100% de tablas (query de verificación)
- [ ] Cabeceras de seguridad aplicadas en middleware
- [ ] CSP configurado sin `unsafe-eval`
- [ ] Rate limiting en todos los endpoints públicos
- [ ] Secretos rotables y en env vars
- [ ] Logs no contienen PII sensible (review manual)
- [ ] `SELECT *` no aparece en código de producción (grep)
- [ ] Dependencias sin CVEs conocidos (`pnpm audit`)
- [ ] Tests de seguridad pasan
