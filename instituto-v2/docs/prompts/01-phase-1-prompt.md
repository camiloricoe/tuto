# Prompt Fase 1 — Auth + RBAC

> **Cómo usar:** al iniciar la Fase 1, creá una branch nueva (`git checkout -b phase/1-auth-rbac`) y pegá este prompt en Claude Code.

---

## Prompt

Vamos con la Fase 1: autenticación y RBAC. Fase 0 (Bootstrap) ya está mergeada.

**Antes de escribir código:**

1. **Releé el `CLAUDE.md`** como recordatorio de reglas y convenciones.

2. **Leé estos archivos completos:**
   - `docs/phases/phase-1-auth-rbac.md` (plan detallado de esta fase)
   - `docs/specs/02-auth-and-rbac.md` (autenticación, roles, permisos)
   - `docs/specs/09-security-and-rls.md` (RLS patterns, rate limiting, cabeceras)
   - `docs/specs/01-data-model.md` secciones 1 y 2 (tenants, users, RBAC)
   - `docs/specs/06-audit-and-logs.md` (entender cómo se setea audit context desde ya)
   - `docs/specs/10-testing-strategy.md` (qué testear en esta fase)

3. **Confirmá que entendiste los puntos críticos de seguridad:**
   - RLS habilitado en toda tabla creada, en la misma migración
   - `FORCE ROW LEVEL SECURITY` además de `ENABLE`
   - Service role key jamás en código cliente
   - Passwords nunca en logs
   - 2FA obligatorio para admin/teacher/coordinator/treasurer, opcional para student
   - Rate limiting desde día 1
   - Audit context (`set_audit_context`) se setea al crear el cliente Supabase server

4. **Hacéme estas preguntas antes de arrancar:**
   - Email del super_admin inicial (se va a seedear)
   - ¿Generar recovery codes para 2FA en MVP o posponer? (recomiendo MVP)
   - ¿Bloquear cuenta después de 10 intentos fallidos? (recomiendo sí)
   - Tiempo de expiración de sesión (default: 12h de inactividad)

5. **Proponé un plan detallado** que incluya:
   - Orden exacto de migraciones SQL (11 archivos según el spec)
   - Por cada migración: qué crea, qué RLS aplica, qué seed tiene
   - Estructura de archivos en `app/(auth)/`, `lib/auth/`, `lib/email/`, `app/actions/`
   - Server Actions a crear (una lista)
   - Templates de email (React Email)
   - Tests obligatorios (referenciar el spec 10)
   - Criterios de done verificables

6. **Esperá mi aprobación.**

7. Durante ejecución:
   - **Una migración por commit** con mensaje descriptivo
   - **Test junto al código**: cada Server Action con su test
   - Después de cada migración: `supabase db reset` y verificar que no rompe
   - RLS tests son obligatorios, no negociables
   - Si encontrás que el spec necesita aclaración, detenete y preguntá

8. **Principios no negociables de esta fase:**
   - Toda tabla nueva → RLS en la misma migración
   - Toda Server Action → `requireSession` + `requirePermission` + Zod + transacción + `logActivity`
   - Todo evento auth → entrada en `auth_events`
   - Middleware de Next.js con routing por rol funcionando
   - Cabeceras de seguridad y CSP aplicadas (aunque sea mínimo)

9. **Al terminar:**
   - `pnpm typecheck && pnpm lint && pnpm test` pasa
   - Correr pruebas manuales del flujo: crear tenant → invitar → activar → login → 2FA → acceder al portal correcto
   - Verificar cada criterio de done del spec de la fase
   - Actualizar `docs/phases/00-roadmap.md`
   - Preparar resumen del PR con: decisiones tomadas, hallazgos, deuda técnica

**Recordatorio importante:**
- No implementes tablas de dominio académico ni de pagos. Solo auth + RBAC + tenants.
- El portal de teacher y student al final de esta fase solo muestra un mensaje "Bienvenido" y logout, sin features todavía.
- El portal de admin tiene lo mínimo para probar el flujo: crear tenant, invitar usuarios.

Arrancá leyendo los archivos y hacé las preguntas pendientes.
