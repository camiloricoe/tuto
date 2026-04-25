# Fase 0 — Bootstrap

**Objetivo**: proyecto Next.js inicializado, pipeline de CI funcionando, deployable a Vercel con Supabase conectado. Sin features de negocio aún.

**Branch**: `phase/0-bootstrap`
**Duración estimada**: 2-4 horas

---

## Pre-requisitos

Antes de arrancar esta fase, el humano debe tener:

- [ ] Cuenta en GitHub con repo privado creado
- [ ] Cuenta en Supabase con proyecto creado (anota: URL, anon key, service role key)
- [ ] Cuenta en Vercel (aún no conectado al repo)
- [ ] Cuenta en Resend con API key
- [ ] (Opcional) Cuenta en Upstash con Redis DB creado
- [ ] (Opcional) Cuenta en Sentry con proyecto creado
- [ ] Docker instalado localmente (para Supabase CLI)
- [ ] Node.js 20+ y pnpm instalados

---

## Decisiones pendientes antes de arrancar

Claude Code debe **preguntar** al humano y esperar respuesta antes de ejecutar:

1. **Nombre del proyecto** (para `package.json`, metadata): `instituto-sistema`?
2. **Nombre de la aplicación visible al usuario** (en UI): `Instituto`? `Academia XYZ`?
3. **Dominio de producción** (si ya lo tienen)
4. **Email de envío** para Resend: `noreply@???.com`?
5. **Rate limiting**: ¿usar Upstash Redis o tabla Postgres?
6. **Monitoring**: ¿usar Sentry desde el día 1 o dejar para Fase 5?
7. **Paleta de colores base** (aunque sea aproximada, para configurar Tailwind theme)

---

## Tareas

### 1. Inicializar Next.js

```bash
pnpm create next-app@latest . --typescript --tailwind --app --use-pnpm --no-eslint --src-dir=false --import-alias="@/*"
```

Decisiones:
- TypeScript: sí
- Tailwind: sí
- App Router: sí
- src/: no (mantener en raíz)
- import alias: `@/*`
- ESLint: lo configuramos manualmente después para tener más control

### 2. Configurar TypeScript estricto

Editar `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    ...
  }
}
```

### 3. ESLint + Prettier

Instalar:
```bash
pnpm add -D eslint@latest eslint-config-next prettier eslint-config-prettier eslint-plugin-prettier
```

Config `.eslintrc.json`:
- Extends: `next/core-web-vitals`, `next/typescript`, `prettier`
- Reglas extra:
  - `@typescript-eslint/no-explicit-any`: error
  - `@typescript-eslint/consistent-type-imports`: error
  - `no-console`: warn (excepto `console.error`, `console.warn`)

Config `.prettierrc`:
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### 4. Instalar dependencias base

```bash
# Core
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add zod react-hook-form @hookform/resolvers
pnpm add date-fns

# UI
pnpm add class-variance-authority clsx tailwind-merge lucide-react
pnpm dlx shadcn@latest init  # configura shadcn

# i18n
pnpm add next-intl

# Dev
pnpm add -D vitest @vitest/coverage-v8 @vitest/ui
pnpm add -D @testing-library/react @testing-library/jest-dom jsdom
pnpm add -D playwright @playwright/test
pnpm add -D @types/node

# Emails (para fase 1, pero instalar ya)
pnpm add resend @react-email/components
pnpm add -D react-email

# PDF (fase 3+)
pnpm add @react-pdf/renderer

# Excel (fase 5)
pnpm add exceljs

# Papa parse (fase 6)
pnpm add papaparse
pnpm add -D @types/papaparse

# Rate limiting (si Upstash)
pnpm add @upstash/ratelimit @upstash/redis

# Monitoring (si Sentry)
pnpm add @sentry/nextjs
```

### 5. Configurar shadcn/ui

```bash
pnpm dlx shadcn@latest init
```

Config sugerida:
- Style: `default`
- Base color: ajustar según branding
- CSS variables: sí
- `components.json` se genera automáticamente

Agregar componentes base (se usarán en fase 1):
```bash
pnpm dlx shadcn@latest add button input label form card dialog dropdown-menu sonner
```

### 6. Estructura de carpetas

Crear:
```
app/
├── (auth)/
│   └── login/
│       └── page.tsx  (placeholder)
├── (student)/
├── (teacher)/
├── (admin)/
├── api/
├── layout.tsx
├── page.tsx
└── globals.css

components/
├── ui/  (shadcn, ya creado)
└── shared/

lib/
├── supabase/
│   ├── client.ts
│   ├── server.ts
│   └── admin.ts
├── auth/  (vacío, se llena en fase 1)
├── db/
├── utils.ts
└── env.ts

messages/
└── es.json

tests/
├── unit/
├── integration/
└── e2e/

supabase/
├── migrations/
├── seed.sql
└── config.toml  (auto-generado por supabase init)

scripts/
└── seed-dev.ts  (placeholder)
```

### 7. Configurar Supabase

```bash
# Instalar CLI (si no está)
brew install supabase/tap/supabase  # macOS
# o ver: https://supabase.com/docs/guides/local-development

# Inicializar
supabase init

# Arrancar local
supabase start
```

Esto crea `supabase/config.toml` y levanta servicios locales.

Anotar las URLs locales:
- API URL: `http://localhost:54321`
- DB URL: `postgresql://postgres:postgres@localhost:54322/postgres`
- Studio: `http://localhost:54323`

### 8. Variables de entorno

Crear `.env.example` (committed):
Ver `/docs/specs/11-deployment-and-ops.md` sección "Variables de entorno".

Crear `.env.local` (gitignored) con valores reales para local:
- Supabase: valores de `supabase status`
- Resend: API key real
- Upstash: si aplica
- Sentry: si aplica

Actualizar `.gitignore`:
```
.env.local
.env*.local
/coverage
/.next
/out
/node_modules
/playwright-report
/test-results
/supabase/.temp
```

### 9. Validación de env vars

Crear `lib/env.ts`:
```ts
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  EMAIL_REPLY_TO: z.string().email(),
  // opcionales
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
})

export const env = envSchema.parse(process.env)
```

### 10. Clientes Supabase

Crear los 3 clientes según el patrón oficial de `@supabase/ssr`:

- `lib/supabase/client.ts`: para Client Components
- `lib/supabase/server.ts`: para Server Components y Server Actions (con cookie handling)
- `lib/supabase/admin.ts`: cliente con service role, solo para código server privilegiado

Seguir [docs oficiales de Supabase SSR con Next.js App Router](https://supabase.com/docs/guides/auth/server-side/nextjs).

### 11. Middleware placeholder

Crear `middleware.ts` en la raíz con:
- Config básica que corre en todas las rutas excepto `/_next/*`, static files
- Refresh de sesión de Supabase
- Sin lógica de redirección aún (se agrega en fase 1)

### 12. Layout raíz

`app/layout.tsx`:
- Font setup
- Metadata básica (title, description)
- Tailwind globals
- Toaster de sonner
- Lang="es"

`app/page.tsx`:
- Placeholder que dice "Sistema de gestión académica - fase 0"
- Link a `/login` (aunque no exista aún, se crea en fase 1)

### 13. i18n scaffolding

Instalar next-intl, configurar para que solo maneje `es` por ahora pero esté listo para expandir.

`messages/es.json`:
```json
{
  "app": {
    "name": "Instituto",
    "tagline": "Sistema de gestión académica"
  },
  "common": {
    "loading": "Cargando...",
    "save": "Guardar",
    "cancel": "Cancelar"
  }
}
```

### 14. Vitest config

`vitest.config.ts`:
- Test environment: jsdom para tests de componentes, node para unit tests de server
- Coverage con v8
- Alias `@/*`

Crear `tests/setup.ts` con imports comunes.

Scripts en `package.json`:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "db:reset": "supabase db reset",
    "db:new-migration": "supabase migration new"
  }
}
```

### 15. Playwright config

`playwright.config.ts`:
- BaseURL: `http://localhost:3000`
- Proyectos: chromium, firefox (webkit opcional)
- Reporter: html
- Retries: 1 en CI

### 16. GitHub Actions

`.github/workflows/ci.yml`:
```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint

  test-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit
```

(Integration y e2e se agregan en fases posteriores cuando tengan contenido).

### 17. Vercel

El humano hace:
1. Vercel → Import Git Repository → selecciona el repo
2. Framework preset: Next.js (auto-detecta)
3. Environment Variables: copia todas las de `.env.example` con valores de producción
4. Deploy

Después del primer deploy:
5. Configurar branches:
   - Production: `main`
   - Preview: todas las demás

### 18. README del proyecto

Actualizar `README.md` root con:
- Descripción breve
- Stack
- Setup local paso a paso
- Comandos comunes
- Link a `/docs/` para documentación detallada

### 19. TECH_DEBT.md

Crear archivo vacío con plantilla:
```markdown
# Deuda Técnica

Lista de shortcuts, decisiones diferidas y mejoras pendientes. Revisar antes de Fase 5.

## Formato
- **Fecha** — **Fase descubierta** — **Descripción** — **Acción sugerida**

---

(vacío por ahora)
```

---

## Criterios de done

- [ ] `pnpm dev` corre sin errores en `http://localhost:3000`
- [ ] `pnpm typecheck` pasa sin errores
- [ ] `pnpm lint` pasa sin errores
- [ ] `pnpm test` corre (aunque no haya tests aún, no debe fallar)
- [ ] `supabase start` levanta servicios locales
- [ ] `lib/env.ts` valida variables correctamente en startup
- [ ] Página root muestra mensaje de fase 0
- [ ] Deploy a Vercel preview exitoso
- [ ] CI de GitHub corre y pasa en un PR dummy
- [ ] `.env.example` tiene todas las vars documentadas
- [ ] `README.md` tiene instrucciones claras de setup
- [ ] Estructura de carpetas creada según spec
- [ ] Todos los clientes Supabase (`client`, `server`, `admin`) funcionan
- [ ] shadcn/ui configurado con componentes base instalados
- [ ] `TECH_DEBT.md` creado

---

## Entregables

- PR con título: `Phase 0: Bootstrap — initial setup`
- Descripción del PR debe incluir:
  - Lista de decisiones tomadas (rate limiting, monitoring, branding)
  - Screenshot del deploy preview funcionando
  - Cualquier dependencia opcional no instalada (con razón)
  - Deuda técnica identificada (si hay)

---

## Notas

- **No implementar autenticación aún.** Eso es fase 1.
- **No crear tablas de dominio.** Solo las mínimas que Supabase crea por default.
- **No crear rutas /s/*, /t/*, /a/* con lógica.** Solo placeholders.
- El objetivo es tener un scaffold limpio que sea la base sólida para construir encima.
