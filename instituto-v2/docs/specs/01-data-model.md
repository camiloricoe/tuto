# Spec 01 — Modelo de Datos

## Convenciones
- Todas las tablas de dominio llevan: `id`, `tenant_id`, `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`.
- IDs son `uuid` (`gen_random_uuid()`).
- Timestamps son `timestamptz`.
- Montos monetarios son `numeric(12,2)` (no `float`).
- RLS habilitado en todas.

---

## 1. Tenancy y usuarios

### `tenants`
Un tenant representa una sede, institución o programa autónomo.
- `id`, `name`, `slug` (único), `settings jsonb`, `active boolean`, `created_at`, `updated_at`.

### `user_profiles`
Extensión de `auth.users`. Una fila por usuario.
- `id` (= `auth.users.id`), `full_name`, `document_type`, `document_number`, `phone`, `avatar_url`, `two_factor_required boolean`, `two_factor_enabled_at`.

### `user_tenant_memberships`
Un usuario puede pertenecer a varios tenants.
- `id`, `user_id`, `tenant_id`, `active boolean`, `joined_at`. Unique: `(user_id, tenant_id)`.

---

## 2. RBAC

### `roles_catalog` (global)
Roles base del sistema. No tienen `tenant_id`.
- `id`, `code` (único: `super_admin`, `admin`, etc.), `name`, `description`, `is_system boolean`.

### `permissions` (global)
Catálogo de permisos nombrados.
- `id`, `code` (único: `grades:read`, `payments:create`, etc.), `description`, `resource`, `action`.

### `roles`
Asignaciones de roles a tenants. Permite roles custom por tenant.
- `id`, `tenant_id` (nullable para roles globales), `code`, `name`, `based_on_role_id` (referencia a `roles_catalog`, opcional).

### `role_permissions`
- `role_id`, `permission_id`. PK compuesta.

### `user_roles`
Qué rol tiene un usuario en qué tenant.
- `id`, `user_id`, `tenant_id`, `role_id`, `assigned_at`, `assigned_by`, `revoked_at nullable`.

---

## 3. Catálogos académicos

### `academic_programs`
Un programa ofrecido por el tenant (ej: "Técnico en Sistemas", "Diplomado en Marketing").
- `id`, `tenant_id`, `code`, `name`, `description`, `modality` (`fixed_curriculum` | `elective` | `cohort`), `duration_periods int`.

### `academic_periods`
Períodos de tiempo (bimestre, semestre, etc.). Cada tenant configura los suyos.
- `id`, `tenant_id`, `program_id` (nullable si el período es transversal), `code` (ej: `2026-B3`), `name`, `kind` (`bimester` | `trimester` | `quadrimester` | `semester` | `custom`), `starts_on date`, `ends_on date`, `active boolean`.

### `grading_schemes`
Esquema de calificación reutilizable.
- `id`, `tenant_id`, `name`, `scale_min numeric`, `scale_max numeric`, `passing_grade numeric`, `uses_letters boolean`, `letter_mapping jsonb` (ej: `[{"min":4.5,"letter":"A"},...]`).

### `subjects`
Materias/asignaturas del programa.
- `id`, `tenant_id`, `program_id`, `code`, `name`, `credits int nullable`, `default_grading_scheme_id`.

### `courses`
Instancia concreta de una materia en un período (ej: "Matemáticas - 2026-B3 - Grupo A").
- `id`, `tenant_id`, `subject_id`, `period_id`, `teacher_id`, `section_code`, `grading_scheme_id` (puede override del subject), `max_students int`, `status` (`draft` | `active` | `closed`).

### `course_evaluations`
Evaluaciones definidas por curso (parcial 1, final, taller, etc.).
- `id`, `course_id`, `code`, `name`, `weight numeric` (0..1), `sequence int`, `due_on date nullable`.

Constraint: suma de `weight` por curso debe ser 1.0 cuando el curso pasa a `active`.

### `enrollments`
Inscripción de un estudiante en un curso.
- `id`, `tenant_id`, `student_id`, `course_id`, `enrolled_at`, `status` (`active` | `withdrawn` | `completed`), `final_grade numeric nullable`, `final_letter text nullable`.

Unique: `(student_id, course_id)`.

---

## 4. Notas

### `grades`
Una nota = la calificación de un estudiante en una evaluación.
- `id`, `tenant_id`, `enrollment_id`, `evaluation_id`, `value numeric`, `letter text nullable`, `comment text nullable`, `status` (`draft` | `published`), `published_at nullable`, `published_by nullable`.

Unique: `(enrollment_id, evaluation_id)`.

### `grades_audit`
Trigger-generated. Ver spec 06.

---

## 5. Pagos

### `payment_concepts`
Catálogo de conceptos cobrables (matrícula, cuota mensualidad, materia, etc.).
- `id`, `tenant_id`, `code`, `name`, `default_amount numeric nullable`, `recurring boolean`.

### `student_charges`
Cargo generado a un estudiante (antes de ser pagado).
- `id`, `tenant_id`, `student_id`, `concept_id`, `program_id nullable`, `period_id nullable`, `amount numeric`, `due_date date`, `status` (`pending` | `paid` | `partial` | `void`), `notes`.

### `payments`
Registro de pago recibido.
- `id`, `tenant_id`, `student_id`, `amount numeric`, `currency text default 'COP'`, `method` (`cash` | `transfer` | `check` | `other`), `reference text nullable`, `paid_on date`, `recorded_by user_id`, `recorded_at timestamptz`, `proof_file_url text nullable`, `notes text nullable`, `status` (`confirmed` | `rejected` | `void`), `external_transaction_id text nullable` (reservado para pasarela futura).

### `payment_allocations`
Un pago puede cubrir uno o varios cargos.
- `id`, `payment_id`, `charge_id`, `amount_applied numeric`.

### `receipts`
Recibo emitido por un pago.
- `id`, `tenant_id`, `payment_id` (unique), `number text` (numeración interna, ej: `2026-000123`), `issued_at`, `pdf_url text`.

### `payments_audit`, `student_charges_audit`
Trigger-generated. Ver spec 06.

---

## 6. Auditoría y logs

### `<table>_audit` (patrón)
Generadas por trigger. Estructura idéntica para cada tabla auditada:
- `audit_id bigserial PK`, `operation char(1)` (`I`/`U`/`D`), `changed_at timestamptz`, `changed_by uuid`, `row_id uuid`, `old_data jsonb`, `new_data jsonb`, `ip_address inet`, `user_agent text`.

Aplicado a: `grades`, `payments`, `student_charges`, `enrollments`, `user_roles`, `user_profiles`.

### `activity_log`
Eventos semánticos de alto nivel para mostrar en UI.
- `id`, `tenant_id`, `actor_user_id`, `action_code` (ej: `grade.published`, `payment.recorded`), `resource_type`, `resource_id`, `summary text`, `metadata jsonb`, `occurred_at`.

### `auth_events`
Eventos de autenticación (login, logout, 2FA setup, password reset).
- `id`, `user_id`, `event` (`login_success` | `login_failed` | `logout` | `2fa_enabled` | `2fa_verified` | `password_reset`), `ip_address`, `user_agent`, `occurred_at`.

---

## 7. Notificaciones

### `notifications`
Notificación in-app.
- `id`, `tenant_id`, `user_id`, `kind` (`grade_published` | `payment_received` | `payment_due` | `announcement`), `title`, `body`, `link text nullable`, `read_at nullable`, `created_at`.

### `email_deliveries`
Bitácora de emails enviados.
- `id`, `tenant_id nullable`, `to_email`, `to_user_id nullable`, `template_code`, `subject`, `status` (`queued` | `sent` | `failed`), `provider_message_id`, `sent_at nullable`, `error text nullable`.

---

## 8. Índices recomendados

- `grades (enrollment_id, evaluation_id)` — ya unique, sirve de índice.
- `enrollments (student_id, course_id)` — ya unique.
- `enrollments (course_id)` — listar estudiantes por curso.
- `payments (student_id, paid_on DESC)` — historial del estudiante.
- `student_charges (student_id, status)` — deuda pendiente.
- `notifications (user_id, read_at) WHERE read_at IS NULL` — unread count.
- `activity_log (tenant_id, occurred_at DESC)` — feed de actividad.
- Todos los audit tables: `(row_id, changed_at DESC)`.

## 9. Vistas

### `v_student_account_statement`
Estado de cuenta computado: total cobrado + total pagado + deuda pendiente por estudiante.

### `v_course_roster_with_grades`
Lista de estudiantes por curso con notas de todas las evaluaciones (solo publicadas).

### `v_admin_income_summary`
Ingresos por período, por concepto (para reportes agregados).
