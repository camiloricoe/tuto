# Sistema de Gestión Académica — Documentación Completa

Paquete de documentación para construir un sistema de gestión académica multi-tenant con Claude Code.

## Estructura de archivos

```
/
├── README.md                          # Este archivo
├── CLAUDE.md                          # Reglas del proyecto (raíz del repo)
│
├── docs/
│   ├── specs/                         # Specificaciones funcionales (QUÉ construir)
│   │   ├── 00-overview.md
│   │   ├── 01-data-model.md
│   │   ├── 02-auth-and-rbac.md
│   │   ├── 03-academic-module.md
│   │   ├── 04-grades-module.md
│   │   ├── 05-payments-module.md
│   │   ├── 06-audit-and-logs.md
│   │   ├── 07-notifications.md
│   │   ├── 08-reports-and-exports.md
│   │   ├── 09-security-and-rls.md
│   │   ├── 10-testing-strategy.md
│   │   ├── 11-deployment-and-ops.md
│   │   └── 12-data-import.md
│   │
│   ├── phases/                        # Plan de ejecución por fases (CÓMO construir)
│   │   ├── 00-roadmap.md              # Visión general de todas las fases
│   │   ├── phase-0-bootstrap.md
│   │   ├── phase-1-auth-rbac.md
│   │   ├── phase-2-academic.md
│   │   ├── phase-3-grades.md
│   │   ├── phase-4-payments.md
│   │   ├── phase-5-reports-hardening.md
│   │   └── phase-6-data-import.md
│   │
│   └── prompts/                       # Prompts listos para pegar en Claude Code
│       ├── 00-initial-prompt.md       # Primer prompt, setup del contexto
│       ├── 01-phase-1-prompt.md
│       ├── 02-phase-2-prompt.md
│       ├── 03-phase-3-prompt.md
│       ├── 04-phase-4-prompt.md
│       ├── 05-phase-5-prompt.md
│       └── 06-phase-6-prompt.md
│
└── TECH_DEBT.md                       # Vacío al inicio, se llena durante el proyecto
```

## Cómo usar esto

### Paso 1: Setup del repo (una sola vez)

```bash
# Crear repo
gh repo create instituto-sistema --private
git clone git@github.com:<tu-usuario>/instituto-sistema.git
cd instituto-sistema

# Copiar TODO este paquete a la raíz del repo
cp -r /ruta/al/paquete/* .

# Commit inicial
git add .
git commit -m "docs: initial project documentation"
git push
```

### Paso 2: Setup de servicios externos (una sola vez, 10 min)

1. **Supabase**: crea proyecto en [supabase.com](https://supabase.com). Anota URL, anon key, service role key.
2. **Resend**: crea cuenta, verifica dominio, anota API key.
3. **Vercel**: conecta el repo (no despliegues aún).
4. **Upstash Redis** (opcional, para rate limiting): crea database.

### Paso 3: Ejecutar fase por fase

Por cada fase del proyecto:

1. Crea una branch: `git checkout -b phase/0-bootstrap`
2. Abre Claude Code en el repo
3. Pega el prompt correspondiente de `docs/prompts/NN-phase-N-prompt.md`
4. Deja que Claude Code ejecute (revisa los planes antes de aprobar)
5. Cuando termine: `pnpm typecheck && pnpm lint && pnpm test`
6. Commit + push + PR + review + merge
7. Siguiente fase

### Orden de ejecución

| # | Fase | Prompt | Duración estimada |
|---|------|--------|-------------------|
| 0 | Bootstrap | `docs/prompts/00-initial-prompt.md` | 2-4 horas |
| 1 | Auth + RBAC | `docs/prompts/01-phase-1-prompt.md` | 1-2 días |
| 2 | Académico | `docs/prompts/02-phase-2-prompt.md` | 2-3 días |
| 3 | Notas | `docs/prompts/03-phase-3-prompt.md` | 2-3 días |
| 4 | Pagos | `docs/prompts/04-phase-4-prompt.md` | 3-4 días |
| 5 | Reportes + hardening | `docs/prompts/05-phase-5-prompt.md` | 2-3 días |
| 6 | Import masivo | `docs/prompts/06-phase-6-prompt.md` | 1-2 días |

Total estimado con Claude Code: **2-3 semanas** de trabajo activo tuyo (supervisión + review + ajustes), no full-time.

## Principios de trabajo con Claude Code

### Antes de codear
- Claude Code **siempre** debe leer los specs y proponer plan antes de ejecutar
- Si no lo hace, detenlo y pídelo

### Durante la ejecución
- Commits pequeños y frecuentes
- Tests corriendo desde día 1
- RLS en cada tabla desde su creación
- Auditoría vía triggers, no código aplicación

### Al terminar una fase
- `pnpm typecheck && pnpm lint && pnpm test` debe pasar
- Criterios de done del spec de fase deben estar cumplidos
- PR con descripción clara

## Decisiones fijas (no discutir con Claude Code)

- Stack: Next.js 15 + TypeScript + Supabase + Tailwind + shadcn/ui
- Deploy: Vercel + Supabase Cloud
- Multi-tenant desde día 1
- RLS en todas las tablas
- Español en UI, inglés en código
- Tests solo en lógica crítica
- MVP sin pasarela de pago, sin bloqueos de mora, sin DIAN

Si Claude Code sugiere cambiar algo de esto, rechaza.

## Decisiones pendientes

Estas te las va a preguntar Claude Code durante Bootstrap:

- Nombre final del proyecto y dominio
- Branding (colores, logo)
- Nombre legal del tenant inicial
- Email de envío (`noreply@???`)
- Si usar Upstash o quedarse con Postgres para rate limiting

Téngalas pensadas antes de arrancar.
