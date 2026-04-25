# Roadmap General de Fases

## Filosofía del rollout

- Cada fase es **independientemente mergeable y funcional**
- Cada fase es **una branch + un PR + un review + un merge**
- Vertical slices: la fase de notas toca BD + backend + UI de profesor + UI de estudiante
- No se avanza sin cumplir criterios de done explícitos

---

## Estado de fases

| # | Fase | Estado | Branch | PR |
|---|------|--------|--------|-----|
| 0 | Bootstrap | ⬜ Pendiente | `phase/0-bootstrap` | - |
| 1 | Auth + RBAC | ⬜ Pendiente | `phase/1-auth-rbac` | - |
| 2 | Módulo académico | ⬜ Pendiente | `phase/2-academic` | - |
| 3 | Módulo de notas | ⬜ Pendiente | `phase/3-grades` | - |
| 4 | Módulo de pagos | ⬜ Pendiente | `phase/4-payments` | - |
| 5 | Reportes + hardening | ⬜ Pendiente | `phase/5-reports` | - |
| 6 | Importación masiva | ⬜ Pendiente | `phase/6-import` | - |

Actualizar esta tabla al terminar cada fase.

---

## Resumen de cada fase

### Fase 0 — Bootstrap
**Objetivo:** proyecto inicializado, pipeline funcionando, deployable.

Setup de Next.js + TypeScript + Tailwind + shadcn/ui. Configuración de Supabase local + Cloud. ESLint + Prettier + Vitest + Playwright. GitHub Actions CI. Deploy inicial a Vercel. Variables de entorno. i18n scaffolding.

**Duración estimada**: 2-4 horas
**Ver**: `phase-0-bootstrap.md`

---

### Fase 1 — Auth + RBAC
**Objetivo:** usuarios pueden crearse, loguearse, tener roles configurables, ver el portal correspondiente.

Tablas: tenants, user_profiles, user_tenant_memberships, roles_catalog, permissions, roles, role_permissions, user_roles, auth_events, activity_log. RLS en todas. Seed de permisos y roles. Login + 2FA + reset. Middleware de Next.js con routing por rol. Rate limiting.

**Duración estimada**: 1-2 días
**Ver**: `phase-1-auth-rbac.md`

---

### Fase 2 — Módulo académico
**Objetivo:** admin modela curriculum; profesores ven cursos asignados; estudiantes ven sus materias.

Tablas: academic_programs, academic_periods, grading_schemes, subjects, courses, course_evaluations, enrollments. CRUDs en portal admin. Listado en portal profesor. Listado en portal estudiante. Constraint de pesos = 1.0.

**Duración estimada**: 2-3 días
**Ver**: `phase-2-academic.md`

---

### Fase 3 — Módulo de notas
**Objetivo:** profesores ingresan y publican notas; estudiantes las ven; cálculo de finales.

Tablas: grades + grades_audit. Trigger de auditoría genérico. Matriz de notas en portal profesor. Publicación atómica con notificaciones batcheadas. Boletín PDF. Cálculo de nota final al cerrar curso.

**Duración estimada**: 2-3 días
**Ver**: `phase-3-grades.md`

---

### Fase 4 — Módulo de pagos
**Objetivo:** admin registra pagos; estudiantes ven estado de cuenta; se generan recibos.

Tablas: payment_concepts, student_charges, payments, payment_allocations, receipts + audits. Transacciones para registrar pago. Generación PDF de recibo con numeración correlativa. Estado de cuenta. Upload de comprobante. Job diario de recordatorios de mora.

**Duración estimada**: 3-4 días
**Ver**: `phase-4-payments.md`

---

### Fase 5 — Reportes + hardening
**Objetivo:** admin tiene dashboards y exports; sistema listo para producción.

Dashboards agregados. Export genérico XLSX/CSV. UI de auditoría. Hardening: review de RLS, cabeceras de seguridad, CSP, Sentry, rate limiting completo, checklist de producción.

**Duración estimada**: 2-3 días
**Ver**: `phase-5-reports-hardening.md`

---

### Fase 6 — Importación masiva
**Objetivo:** sistema puede ingerir datos del sistema anterior al momento del go-live.

Importador CSV con dry-run + confirm. Plantillas descargables. Batching para cargas grandes. Soporte para estudiantes, profesores, cargos, pagos, notas y enrollments.

**Duración estimada**: 1-2 días
**Ver**: `phase-6-data-import.md`

---

## Después del MVP (Fase 2+ del producto, no planificado detalladamente)

Ideas para iterar post-producción:
- Pasarela de pago online (Wompi / Mercado Pago)
- Bloqueo automático por mora con niveles configurables
- Facturación DIAN con integración Siigo/Alegra
- Módulo de asistencia
- Subida de materiales por profesor
- Mensajería interna
- App móvil nativa (React Native)
- WhatsApp/SMS notifications
- Matriz granular de preferencias de notificación
- i18n completo
- Analytics de comportamiento de estudiantes (al riesgo de deserción)
- API pública para integraciones

---

## Reglas entre fases

### No saltar fases
Cada fase depende de la anterior. No empezar la 3 si la 2 no está completa.

### No mezclar en mismo PR
Una branch = una fase. Si descubres que algo de la fase 4 es necesario en la 3, documéntalo en TECH_DEBT.md y seguí con la 3.

### Actualizar specs
Si durante una fase descubres que el spec está incompleto o incorrecto, actualízalo en commit separado **antes** de implementar el cambio.

### Actualizar este roadmap
Al terminar cada fase, actualizar la tabla de estado arriba con el link al PR mergeado.
