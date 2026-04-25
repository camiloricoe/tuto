# CLAUDE.md — Reglas del Proyecto

Este archivo es la fuente de verdad sobre cómo trabajar en este repositorio. Léelo completo antes de cualquier acción.

Si este archivo contradice un spec de `/docs/specs/`, **gana el spec**. Si dos specs se contradicen, **detente y pregunta**.

---

## 1. Contexto del proyecto

Sistema web de gestión académica para institutos educativos. Multi-tenant por programa/sede. Tres tipos de usuarios base (estudiante, profesor, admin) con roles configurables y permisos granulares.

**Funcionalidades MVP:**
- Modelo académico flexible (bimestres/semestres/cuatrimestres, cursos fijos/electivos/cohortes)
- Notas con esquemas configurables por materia (escala numérica, letras opcionales, pesos)
- Pagos con registro manual por admin (sin pasarela online en MVP)
- Recibos PDF simples (sin DIAN)
- Notificaciones por email + in-app
- Auditoría completa de cambios en datos críticos
- Reportes: boletines PDF, estados de cuenta PDF, reportes agregados, export genérico XLSX/CSV

**Referencia autoritativa del alcance:** `/docs/specs/`. Ejecución paso a paso: `/docs/phases/`.

---

## 2. Stack tecnológico

- **Next.js 15** con App Router, Server Components por defecto
- **TypeScript estricto** (`"strict": true`, `"noUncheckedIndexedAccess": true`)
- **Supabase**: Postgres 15+, Auth, RLS, Storage, Realtime
- **Tailwind CSS 4** + **shadcn/ui** (no otras librerías de componentes)
- **Zod** para validación
- **React Hook Form** para formularios
- **next-intl** para i18n (preparado aunque solo use `es`)
- **Vitest** para tests unitarios/integración
- **Playwright** para e2e (solo flujos críticos)
- **Resend** + **@react-email/components** para emails
- **@react-pdf/renderer** para PDFs
- **exceljs** para exports XLSX
- **Vercel** para deployment

**No agregar dependencias sin aprobación explícita.**

---

## 3. Estructura del repositorio

```
/
├── CLAUDE.md
├── README.md
├── TECH_DEBT.md
├── .env.example
├── docs/
│   ├── specs/           # QUÉ construir
│   ├── phases/          # CÓMO construir (paso a paso por fase)
│   └── prompts/         # Prompts de Claude Code (archivo por fase)
├── app/
│   ├── (auth)/          # login, signup, 2FA, reset
│   ├── (student)/       # portal estudiante → rutas /s/*
│   ├── (teacher)/       # portal profesor → rutas /t/*
│   ├── (admin)/         # portal admin → rutas /a/*
│   └── api/             # solo cuando Server Actions no aplica
├── components/
│   ├── ui/              # shadcn primitives
│   └── [feature]/       # componentes de dominio
├── lib/
│   ├── supabase/        # clientes server/client/admin
│   ├── auth/            # sesión y permisos
│   ├── db/              # queries tipadas
│   ├── pdf/             # generadores de PDF
│   ├── email/           # templates y envío
│   ├── audit/           # activity log
│   ├── notifications/   # in-app y email helpers
│   └── validators/      # schemas Zod
├── messages/
│   └── es.json          # strings UI en español
├── supabase/
│   ├── migrations/      # SQL migrations ordenadas por timestamp
│   ├── seed.sql         # data de desarrollo
│   └── functions/       # edge functions si necesario
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── scripts/
    └── import-csv/      # scripts de importación
```

---

## 4. Convenciones de código

### TypeScript
- **Nunca** `any`. Si necesitas escapar, usa `unknown` y valida con Zod.
- Prefiere `type` sobre `interface` excepto para `extends`.
- Exporta tipos derivados de Zod: `type Student = z.infer<typeof studentSchema>`.
- **Nunca** funciones >60 líneas sin justificación. Refactoriza.

### Nombres
- **Archivos**: `kebab-case.ts` (ej: `grade-calculator.ts`)
- **Componentes React**: `PascalCase.tsx`
- **Tablas Postgres**: `snake_case` plural
- **Columnas**: `snake_case`
- **Funciones/variables TS**: `camelCase`
- **Constantes**: `UPPER_SNAKE_CASE`
- **Permisos**: `resource:action` o `resource:action:scope`

### Internacionalización
- Código, comentarios, commits, nombres técnicos: **inglés**
- Strings visibles: **español**, en `messages/es.json`
- Nunca hardcodees strings visibles en componentes

### Git
- Conventional Commits en inglés: `feat(auth): add 2FA via TOTP`
- Commits atómicos (un cambio lógico = un commit)
- Branch por fase: `phase/0-bootstrap`, `phase/1-auth-rbac`, etc.
- PR por fase con checklist de done

---

## 5. Reglas de base de datos (CRÍTICAS)

### 5.1 RLS obligatorio
Toda tabla creada debe tener RLS habilitado **en la misma migración**. Sin excepciones.

```sql
CREATE TABLE foo (...);
ALTER TABLE foo ENABLE ROW LEVEL SECURITY;
-- luego políticas
```

Ver `/docs/specs/09-security-and-rls.md` para políticas estándar.

### 5.2 Columnas estándar
Toda tabla de dominio incluye:
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
tenant_id uuid NOT NULL REFERENCES tenants(id),
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
created_by uuid REFERENCES auth.users(id),
updated_by uuid REFERENCES auth.users(id),
deleted_at timestamptz NULL
```

Excepciones: tablas `*_audit`, catálogos globales (`permissions`, `roles_catalog`).

### 5.3 Auditoría automática
Tablas críticas (grades, payments, enrollments, user_roles, user_profiles, student_charges) deben tener trigger de auditoría. Ver `/docs/specs/06-audit-and-logs.md`.

### 5.4 Soft deletes
Nunca borres filas académicas o financieras. Usa `deleted_at` + filtro.

### 5.5 Migraciones
- Nombre: `YYYYMMDDHHMMSS_descripcion.sql`
- Una migración = un cambio lógico
- Nunca edites migraciones ya mergeadas a main

### 5.6 Números monetarios
- `numeric(12,2)`, nunca `float`
- Moneda default: `COP`

---

## 6. Reglas de seguridad

1. **Service role key**: solo en Server Actions y edge functions. Nunca en Client Components.
2. **Tenant/user IDs**: siempre derivados de la sesión del servidor. **Nunca** del cliente.
3. **Input del usuario**: validado con Zod antes de tocar BD.
4. **Server Actions** para mutaciones. API routes solo para webhooks/integraciones.
5. **Rate limiting** en auth desde día 1.
6. **2FA**: obligatorio para admin/teacher, opcional para student.
7. **Secrets**: solo en env vars. Jamás commitees `.env*` (excepto `.env.example`).
8. **Logs**: nunca passwords, tokens, PII sensible.
9. **Audit context**: setear `app.user_id` al inicio de cada request.

Detalle completo: `/docs/specs/09-security-and-rls.md`.

---

## 7. Testing

Escribe tests para:
- Cálculos (promedios, letter mapping, allocations de pagos)
- Triggers de auditoría (verificar disparo y contenido)
- Políticas RLS (cruces negativos: estudiante no ve datos de otro)
- Flujos críticos e2e (login, publicar nota, registrar pago)

NO escribas tests para:
- UI trivial
- Wrappers de librerías
- Tipos puros

Umbrales: **>80% cobertura** en `lib/` crítico (auth, grades, payments, audit).

Comando: `pnpm test`. CI falla si baja cobertura crítica.

Detalle: `/docs/specs/10-testing-strategy.md`.

---

## 8. Workflow con Claude Code

### 8.1 Antes de codear
1. **Leer spec(s) relevantes completos**
2. **Proponer plan** (archivos a crear, migraciones, tests, criterios de done)
3. **Esperar aprobación** del humano

### 8.2 Durante la ejecución
1. **Commits pequeños y frecuentes** (uno por sub-tarea)
2. **Actualizar spec** si se descubre que estaba incorrecto (en commit separado)
3. **Anotar deuda técnica** en `TECH_DEBT.md` con fecha y contexto
4. **Correr tests** después de cada cambio significativo

### 8.3 Al terminar una fase
1. `pnpm typecheck && pnpm lint && pnpm test` debe pasar
2. Actualizar `/docs/phases/NN-phase-N.md` marcando done
3. Escribir resumen del PR: qué se hizo, qué quedó pendiente, decisiones tomadas

### 8.4 Preguntar siempre
- Ambigüedades en specs
- Decisiones de UX no especificadas
- Cambios de alcance
- Cambios de esquema de BD
- Instalar dependencias nuevas

### 8.5 No preguntar (decidir solo)
- Nombres de variables locales
- Estructura interna de componentes
- Refactors locales sin cambio de contrato
- Decisiones ya en un spec

---

## 9. Anti-patrones prohibidos

- Lógica de negocio en Client Components
- Queries directas a Supabase desde componentes (usar `/lib/db/`)
- `useEffect` para fetch inicial (usar Server Components)
- CSS-in-JS (usar Tailwind)
- Validación solo en cliente (siempre también en servidor/DB)
- Strings hardcoded en componentes (usar `messages/es.json`)
- `SELECT *` en producción
- Passwords/tokens en logs o commits
- Modificar migraciones ya mergeadas
- `any` en TypeScript
- Saltarse RLS con service role "porque es más fácil"

---

## 10. Estado y navegación

**Fase actual:** Ver `/docs/phases/00-roadmap.md` para el estado de cada fase.

**Al empezar una fase**, el prompt correspondiente está en `/docs/prompts/`.

**Si Claude Code no tiene contexto claro**, siempre leer en este orden:
1. Este archivo (`CLAUDE.md`)
2. `/docs/specs/00-overview.md`
3. El spec específico de la fase que toca
4. `/docs/phases/` correspondiente
