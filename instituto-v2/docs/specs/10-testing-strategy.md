# Spec 10 — Estrategia de Testing

## Filosofía

No buscamos 100% de cobertura. Buscamos **alta cobertura en lógica crítica** (la que si falla, causa pérdida de datos, mal cálculo de notas/dinero, o compromete seguridad) y **casi nada de tests** en capas que no agregan valor (UI trivial, wrappers).

**Regla**: si romper algo causaría un incidente en producción, está tested. Si no, no.

---

## Capas de testing

### 1. Unit tests (Vitest)

**Qué testear:**
- Funciones puras de cálculo (notas, allocations, letter mapping)
- Validadores Zod
- Helpers de formato (fechas, moneda)
- Queries tipadas en `/lib/db/` (con mock de Supabase)

**Qué NO testear:**
- Funciones triviales (setters, getters)
- Componentes UI puros
- Wrappers directos de librerías

**Archivos:** `tests/unit/**/*.test.ts` o colocated `**/*.test.ts`.

### 2. Integration tests (Vitest + Supabase local)

**Qué testear:**
- Server Actions end-to-end contra BD real local
- RLS policies (¡lo más importante!)
- Triggers de auditoría
- Transacciones
- Constraints de BD

**Archivos:** `tests/integration/**/*.test.ts`.

### 3. E2E tests (Playwright)

**Qué testear (solo flujos críticos):**
- Login + 2FA setup
- Profesor publica notas → estudiante las ve
- Admin registra pago → estudiante ve recibo
- Admin exporta datos
- Estudiante descarga boletín PDF

**Qué NO testear:**
- Cada variante de formulario
- Cada hover state

**Archivos:** `tests/e2e/**/*.spec.ts`.

---

## Estructura de tests

```
tests/
├── unit/
│   ├── grades/
│   │   ├── calculate-final-grade.test.ts
│   │   └── apply-letter.test.ts
│   ├── payments/
│   │   ├── allocate-payment.test.ts
│   │   └── receipt-numbering.test.ts
│   └── validators/
│       └── schemas.test.ts
├── integration/
│   ├── rls/
│   │   ├── grades-rls.test.ts
│   │   ├── payments-rls.test.ts
│   │   └── tenant-isolation.test.ts
│   ├── audit/
│   │   ├── grades-audit-trigger.test.ts
│   │   └── payments-audit-trigger.test.ts
│   ├── actions/
│   │   ├── publish-grades.test.ts
│   │   └── record-payment.test.ts
│   └── helpers/
│       ├── setup-db.ts
│       └── test-users.ts
└── e2e/
    ├── auth.spec.ts
    ├── grades-flow.spec.ts
    └── payments-flow.spec.ts
```

---

## Cobertura mínima por módulo

| Módulo | Unit | Integration | E2E |
|---|---|---|---|
| `lib/auth/*` | 80% | Sí (login, 2FA, perms) | Sí |
| `lib/grades/*` | 95% (cálculos) | Sí (RLS + actions) | Sí (flujo publicar) |
| `lib/payments/*` | 95% (allocations, numbering) | Sí (transacciones) | Sí (flujo registrar) |
| `lib/audit/*` | 70% | Sí (triggers) | No |
| `lib/pdf/*` | 50% (templates) | Sí (render) | Sí (descarga) |
| `lib/db/*` queries | 70% | Sí | No |
| `components/*` | 0% | 0% | Solo a través de e2e |
| `app/*/page.tsx` | 0% | 0% | Solo a través de e2e |

CI verifica cobertura con `vitest --coverage` y falla si cae del umbral en módulos críticos.

---

## Tests específicos obligatorios por spec

### Notas (spec 04)

```ts
describe('calculateFinalGrade', () => {
  it('retorna null si falta alguna evaluación publicada')
  it('calcula promedio ponderado correctamente')
  it('redondea a 2 decimales')
  it('no cuenta notas en draft')
})

describe('applyLetter', () => {
  it('devuelve null si el esquema no usa letras')
  it('aplica el primer match del mapping ordenado desc')
  it('maneja valor exactamente en el límite')
})

describe('publishGrades action', () => {
  it('publica todas las notas seleccionadas atómicamente')
  it('falla si el user no es el profesor del curso')
  it('genera notifications para los estudiantes afectados')
  it('registra en activity_log')
})

describe('grades RLS', () => {
  it('estudiante ve solo sus notas published')
  it('estudiante no ve notas en draft de otro')
  it('profesor del curso ve todas las notas del curso')
  it('profesor de otro curso no ve notas ajenas')
  it('admin ve todo en su tenant, nada en otros tenants')
})

describe('grades audit trigger', () => {
  it('registra INSERT con new_data')
  it('registra UPDATE con old_data y new_data')
  it('registra changed_by desde app.user_id')
})
```

### Pagos (spec 05)

```ts
describe('allocatePayment', () => {
  it('suma de allocations no puede exceder monto total')
  it('allocations FIFO automáticas por due_date')
  it('marca charges como paid/partial correctamente')
})

describe('receipt numbering', () => {
  it('numeración correlativa por tenant y año')
  it('no genera huecos en numeración')
  it('10 pagos concurrentes generan 10 números únicos')
  it('voided receipts no liberan el número')
})

describe('recordPayment action', () => {
  it('crea payment + allocations + receipt en transacción')
  it('falla si monto allocations > monto pago')
  it('genera notificación al estudiante')
})

describe('voidPayment action', () => {
  it('revierte allocations, marca receipt voided')
  it('requiere razón de al menos 20 caracteres')
  it('registra en audit con razón')
})

describe('payments RLS', () => {
  it('estudiante ve solo sus pagos')
  it('treasurer puede leer y escribir pagos')
  it('teacher no puede leer pagos')
})
```

### Auth + RBAC (spec 02)

```ts
describe('login', () => {
  it('credenciales correctas → sesión creada')
  it('password incorrecto → auth_events con failed')
  it('rate limit: 6to intento falla')
  it('2FA obligatorio: redirige a setup si no configurado')
})

describe('requirePermission', () => {
  it('lanza ForbiddenError si falta permiso')
  it('permite si tiene el permiso en el tenant')
  it('scope :own valida ownership')
})

describe('tenant isolation', () => {
  it('user de tenant A no lee tablas de tenant B')
  it('cambio de tenant activo actualiza contexto')
})
```

### Auditoría (spec 06)

```ts
describe('audit context', () => {
  it('set_audit_context persiste durante la transacción')
  it('sin contexto, trigger funciona con changed_by=null')
})

describe('activity_log', () => {
  it('logActivity inserta con metadata correcta')
  it('action_code debe ser del catálogo conocido')
})
```

---

## Setup de tests de integración

### Supabase local

```bash
# Iniciar local
supabase start

# Aplicar migraciones
supabase db reset

# Seed de datos de test
pnpm tsx scripts/seed-test.ts
```

### Helper de setup

```ts
// tests/integration/helpers/setup-db.ts
export async function resetDatabase() {
  // TRUNCATE de todas las tablas excepto catálogos
  await supabaseAdmin.rpc('truncate_test_data')
}

export async function createTestUser(role: string, tenantId: string) {
  // Crea user en auth.users + user_profiles + user_roles
}

export async function asUser(userId: string) {
  // Retorna un cliente supabase autenticado como ese usuario
}
```

### Ejemplo de integration test de RLS

```ts
describe('grades RLS - student isolation', () => {
  let tenantId: string
  let student1: string
  let student2: string
  let course: string

  beforeEach(async () => {
    await resetDatabase()
    tenantId = await createTenant()
    student1 = await createTestUser('student', tenantId)
    student2 = await createTestUser('student', tenantId)
    course = await createCourse(tenantId)
    // ... crear enrollments y notas
  })

  it('student1 no puede leer notas de student2', async () => {
    const supa = asUser(student1)
    const { data, error } = await supa
      .from('grades')
      .select('*')
      .eq('student_id', student2)

    expect(data).toEqual([])  // RLS filtra, no error
  })
})
```

---

## Mocking policies

### Qué mockear
- Servicios externos en unit tests (Resend, Upstash)
- Supabase en unit tests de componentes/server actions

### Qué NO mockear
- Supabase en integration tests (usar DB local real)
- Lógica de negocio (testear contra la implementación real)

### Librerías recomendadas
- `vi.mock()` de Vitest para módulos
- `msw` (Mock Service Worker) para interceptar HTTP en e2e

---

## CI / CD

### GitHub Actions workflow

```yaml
# .github/workflows/ci.yml
name: CI
on: [pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - pnpm install
      - pnpm lint
      - pnpm typecheck

  test-unit:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - pnpm install
      - pnpm test:unit --coverage
      - upload coverage

  test-integration:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - pnpm install
      - supabase start
      - supabase db reset
      - pnpm test:integration

  test-e2e:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - pnpm install
      - supabase start
      - pnpm build
      - pnpm playwright test
```

### Scripts en `package.json`

```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test"
  }
}
```

### Thresholds de cobertura

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        'lib/auth/**': { branches: 80, functions: 80, lines: 80 },
        'lib/grades/**': { branches: 90, functions: 95, lines: 90 },
        'lib/payments/**': { branches: 90, functions: 95, lines: 90 },
        'lib/audit/**': { branches: 70, functions: 70, lines: 70 },
      }
    }
  }
})
```

---

## Anti-patrones

❌ **Tests que testean el mock, no el código**
❌ Tests que dependen de orden de ejecución
❌ Tests flaky tolerados (detenerse y arreglar siempre)
❌ `sleep` o `waitFor(timeout)` excesivos en e2e
❌ Tests que modifican shared state sin cleanup
❌ Tests que usan datos hardcodeados de producción
❌ Duplicar lógica de producción en el test (testea el contrato, no la implementación)

---

## Seeding para tests

Scripts en `scripts/`:

- `seed-dev.ts`: datos realistas para desarrollo (200 estudiantes, 20 cursos, notas y pagos ficticios)
- `seed-test.ts`: datos mínimos para tests e2e (consistentes, reproducibles)

Ambos idempotentes: pueden correr múltiples veces sin duplicar.
