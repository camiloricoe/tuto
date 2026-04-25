# TUTO

Sistema de gestion academica multi-tenant.

## Stack

- **Next.js 16** — App Router, Server Components
- **TypeScript** — strict mode
- **Supabase** — Postgres, Auth, RLS, Storage, Realtime
- **Tailwind CSS 4** + **shadcn/ui**
- **Sentry** — error tracking
- **Vitest** + **Playwright** — testing

## Setup local

```bash
# Requisitos: Node.js 22+, pnpm, Docker, Supabase CLI

# Instalar dependencias
pnpm install

# Copiar variables de entorno
cp .env.example .env.local
# Editar .env.local con valores de supabase local

# Levantar Supabase local
supabase start

# Copiar las keys del output de supabase start a .env.local

# Iniciar dev server
pnpm dev
```

## Comandos

| Comando | Descripcion |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de produccion |
| `pnpm typecheck` | Verificar tipos TypeScript |
| `pnpm lint` | Ejecutar ESLint |
| `pnpm test` | Tests unitarios |
| `pnpm test:coverage` | Tests con cobertura |
| `pnpm test:e2e` | Tests end-to-end |
| `pnpm db:reset` | Reset de BD local |
| `pnpm db:new-migration` | Crear nueva migracion |

## Documentacion

Ver [`instituto-v2/docs/`](./instituto-v2/docs/) para specs y plan de fases.
