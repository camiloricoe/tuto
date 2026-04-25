# Spec 06 — Auditoría y Logs

## Filosofía

Trazabilidad total de **quién hizo qué y cuándo**, implementada en dos capas:

1. **Nivel BD**: triggers de Postgres que capturan todo cambio en tablas críticas.
2. **Nivel aplicación**: `activity_log` con eventos semánticos para mostrar en UI.

**Por qué dos capas:** los triggers son incondicionales — aunque alguien se salte la lógica de negocio (acceso directo a BD, bugs, etc.), queda registro. El activity log es para visibilidad operacional en UI: contiene eventos de alto nivel, legibles, con contexto.

---

## Capa 1: triggers de auditoría

### Función genérica

```sql
CREATE OR REPLACE FUNCTION audit.log_changes()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
  v_ip inet;
  v_ua text;
BEGIN
  -- Lee metadata de la sesión (current_setting, seteado por la app)
  v_user_id := nullif(current_setting('app.user_id', true), '')::uuid;
  v_ip := nullif(current_setting('app.ip', true), '')::inet;
  v_ua := nullif(current_setting('app.user_agent', true), '');

  IF TG_OP = 'INSERT' THEN
    EXECUTE format(
      'INSERT INTO %I (operation, changed_at, changed_by, row_id, old_data, new_data, ip_address, user_agent)
       VALUES (''I'', now(), $1, $2, NULL, $3, $4, $5)',
      TG_TABLE_NAME || '_audit'
    ) USING v_user_id, NEW.id, to_jsonb(NEW), v_ip, v_ua;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    EXECUTE format(
      'INSERT INTO %I (operation, changed_at, changed_by, row_id, old_data, new_data, ip_address, user_agent)
       VALUES (''U'', now(), $1, $2, $3, $4, $5, $6)',
      TG_TABLE_NAME || '_audit'
    ) USING v_user_id, NEW.id, to_jsonb(OLD), to_jsonb(NEW), v_ip, v_ua;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    EXECUTE format(
      'INSERT INTO %I (operation, changed_at, changed_by, row_id, old_data, new_data, ip_address, user_agent)
       VALUES (''D'', now(), $1, $2, $3, NULL, $4, $5)',
      TG_TABLE_NAME || '_audit'
    ) USING v_user_id, OLD.id, to_jsonb(OLD), v_ip, v_ua;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Tablas auditadas (MVP)
- `grades` → `grades_audit`
- `payments` → `payments_audit`
- `student_charges` → `student_charges_audit`
- `enrollments` → `enrollments_audit`
- `user_roles` → `user_roles_audit`
- `user_profiles` → `user_profiles_audit`

Cada una se crea con el mismo esquema:
```sql
CREATE TABLE grades_audit (
  audit_id bigserial PRIMARY KEY,
  operation char(1) NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid,
  row_id uuid NOT NULL,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text
);
CREATE INDEX ON grades_audit (row_id, changed_at DESC);
CREATE INDEX ON grades_audit (changed_by, changed_at DESC);

CREATE TRIGGER audit_grades
AFTER INSERT OR UPDATE OR DELETE ON grades
FOR EACH ROW EXECUTE FUNCTION audit.log_changes();
```

### Cómo la app setea `app.user_id`

En `/lib/supabase/server.ts`, al crear el cliente para una request:

```ts
// Pseudo-código
const { data: { user } } = await supabase.auth.getUser()
if (user) {
  await supabase.rpc('set_audit_context', {
    p_user_id: user.id,
    p_ip: request.headers.get('x-forwarded-for') ?? null,
    p_user_agent: request.headers.get('user-agent') ?? null,
  })
}
```

La función `set_audit_context` hace `PERFORM set_config('app.user_id', ...)`. Esto solo aplica durante la transacción actual.

---

## Capa 2: activity log

### Estructura
Tabla `activity_log` (ver spec 01). Eventos semánticos con `action_code` del catálogo:

**Académico:**
- `course.created`, `course.activated`, `course.closed`
- `enrollment.added`, `enrollment.withdrawn`
- `grade.drafted`, `grade.published`, `grade.modified_after_publish`

**Financiero:**
- `charge.created`, `charge.modified`, `charge.voided`
- `payment.recorded`, `payment.voided`
- `receipt.generated`

**Administrativo:**
- `user.invited`, `user.activated`, `user.deactivated`
- `role.assigned`, `role.revoked`
- `tenant.settings_updated`

**Sistema:**
- `notification.broadcast_sent`

### Cuándo escribir
Cada Server Action que ejecuta una operación con significado de negocio hace un `insertActivityLog(...)` al final de la transacción exitosa.

Helper:
```ts
// lib/audit/activity.ts
export async function logActivity(params: {
  tenantId: string
  actorUserId: string
  actionCode: string
  resourceType: string
  resourceId: string
  summary: string
  metadata?: Record<string, unknown>
}): Promise<void>
```

---

## UI de auditoría

### `/a/audit` — Dashboard de admin
- Filtros: por rango de fechas, por usuario actor, por action code, por tenant (si super_admin).
- Vista principal: feed de `activity_log` más reciente.
- Click en una entrada → detalle con:
  - Summary legible
  - Metadata JSON
  - Link al audit de BD relacionado si existe

### `/a/audit/record/[table]/[id]` — Historial de una fila
- Muestra todas las entradas de `<table>_audit` para `row_id = id`.
- Diff visual entre `old_data` y `new_data` de cada cambio.
- Quién hizo el cambio, cuándo, desde qué IP.

### Eventos de autenticación
- `/a/audit/auth` — feed de `auth_events`.
- Útil para detectar accesos sospechosos.

---

## Retención

- `activity_log`: sin expiración en MVP (pasamos a archivar a Glacier en Fase 3 si crece mucho).
- `auth_events`: 1 año.
- `*_audit`: sin expiración (es registro forense).
- `notifications` leídas hace >90 días: se pueden purgar con job.
- `email_deliveries` viejas (>1 año): se archivan.

---

## Privacidad

- Los audit logs contienen valores de negocio (notas, pagos), no credenciales.
- `user_profiles_audit` **no** guarda passwords (nunca están en la tabla).
- IPs se guardan por seguridad pero el tenant puede configurar "anonimizar IP" en settings (reemplaza último octeto).
- Acceso a audit logs es exclusivo de roles con permiso `audit:read`.

---

## Tests críticos

1. Insertar una nota → aparece en `grades_audit` con operation `I`.
2. Actualizar una nota → `grades_audit` con operation `U`, `old_data` y `new_data` correctos.
3. Sin `app.user_id` seteado → el trigger igualmente funciona pero con `changed_by = NULL` (no falla).
4. Un usuario común **no puede** leer `grades_audit` directamente (RLS o permiso).
5. `logActivity` queda en `activity_log` con el metadata correcto.
6. Un `activity_log` de `grade.published` tiene referencia cruzada a las filas de `grades_audit` que se generaron en la misma operación.
