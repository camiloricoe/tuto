# Spec 00 — Overview y Arquitectura

## Propósito
Sistema web de gestión académica para institutos educativos. Reemplaza hojas de cálculo y procesos manuales con una plataforma centralizada, auditable y segura.

## Usuarios y roles

| Rol | Descripción | 2FA |
|-----|-------------|-----|
| `super_admin` | Control total, crea roles personalizados, gestiona tenants | Obligatorio |
| `admin` | Administración general del instituto | Obligatorio |
| `coordinator` | Coordinación académica (cursos, asignaciones, calendario) | Obligatorio |
| `treasurer` | Registro y consulta de pagos, estados de cuenta | Obligatorio |
| `teacher` | Gestión de notas de sus cursos asignados | Obligatorio |
| `student` | Consulta de notas y estado de cuenta propios | Opcional |

Los permisos son configurables por rol (RBAC). Un `super_admin` puede crear roles custom con permisos específicos (ej: "admin que solo ve pagos pero no notas").

## Decisiones arquitectónicas clave

### Multi-tenancy
- Modelo **shared database, shared schema** con `tenant_id` en toda tabla de dominio.
- RLS enforza el aislamiento a nivel de base de datos.
- Un usuario puede pertenecer a múltiples tenants (ej: profesor que enseña en dos sedes) vía tabla `user_tenant_memberships`.

### Autenticación
- Supabase Auth para email/password y 2FA (TOTP).
- Sesión en cookie httpOnly, leída en Server Components vía middleware.
- JWT incluye claims custom: `tenant_id` activo, `roles` del usuario en ese tenant.

### Autorización
- RBAC con tablas `roles`, `permissions`, `role_permissions`, `user_roles`.
- Permisos nombrados por recurso y acción: `grades:read`, `grades:write`, `payments:create`, etc.
- Checks en 3 capas:
  1. **Middleware de Next.js**: redirige por rol
  2. **Server Action / Route Handler**: verifica permiso específico
  3. **RLS de Postgres**: última línea de defensa

### Separación de portales
Tres layouts principales bajo rutas agrupadas:
- `/s/*` → portal estudiante
- `/t/*` → portal profesor
- `/a/*` → portal administrativo

El middleware redirige al portal correspondiente según el rol activo. Un usuario con múltiples roles puede cambiar entre portales.

### Datos y consistencia
- **Postgres es la fuente de verdad**, no la caché de Next.js.
- Transacciones para operaciones que modifican múltiples tablas (registro de pago + generación de recibo + notificación).
- Soft delete (`deleted_at`) para datos académicos y financieros.

### Auditoría
- Dos capas (ver spec 06):
  1. Triggers de Postgres en tablas críticas → tablas `*_audit`
  2. Activity log de alto nivel para UI de "historial"

### Notificaciones
- **Email** vía Resend (transaccional).
- **In-app** vía tabla `notifications` + Supabase Realtime para push al cliente.

### Archivos y PDFs
- PDFs generados server-side con `@react-pdf/renderer`.
- Almacenamiento en Supabase Storage con URLs firmadas de corta duración.
- Recibos se archivan; boletines se generan on-demand.

## Flujos principales

### Registro de un estudiante nuevo
1. Admin crea registro en `/a/students/new`
2. Sistema crea usuario en Supabase Auth con password temporal
3. Se envía email con link de activación
4. Estudiante activa cuenta, configura password
5. Admin asigna estudiante a programa/cohorte y enrolla en cursos

### Profesor publica notas
1. Profesor entra a `/t/courses/[id]/grades`
2. Ve lista de estudiantes enrolados
3. Ingresa notas por evaluación (según esquema del curso)
4. Guarda como **borrador** (visible solo para él)
5. **Publica**: el estudiante ve las notas y se dispara notificación
6. Cambios posteriores quedan en el audit log

### Admin registra un pago
1. Admin entra a `/a/students/[id]/payments/new`
2. Selecciona el concepto (matrícula, cuota #N, materia, etc.)
3. Ingresa monto, método (efectivo/transferencia), fecha, referencia
4. Sube comprobante (opcional) a Storage
5. Sistema genera recibo PDF con numeración interna
6. Estudiante recibe notificación email + in-app

### Estudiante consulta su información
1. Login → portal `/s/dashboard`
2. Ve resumen: cursos actuales, promedio general, estado de cuenta
3. Acceso a `/s/grades`: notas detalladas por período
4. Acceso a `/s/payments`: historial de pagos + deuda pendiente + descarga de recibos

## Escala esperada
- Diseño preparado para 5,000+ estudiantes y 10+ tenants
- Índices en columnas de alta cardinalidad (`tenant_id`, `student_id`, `course_id`, `period_id`)
- Paginación obligatoria en listas >50 items
- Reports agregados vía vistas materializadas cuando sea necesario (Fase 5)

## Lo que NO incluye el MVP
Para mantener alcance claro, el MVP **no incluye**:
- Pasarela de pago online
- Bloqueo automático por mora
- Asistencia
- Subida de materiales por profesor
- Mensajería interna
- App móvil nativa
- Facturación DIAN / numeración fiscal
- WhatsApp / SMS

Todas estas funcionalidades se consideran Fase 2+, con el modelo de datos diseñado para no requerir rewrites.
