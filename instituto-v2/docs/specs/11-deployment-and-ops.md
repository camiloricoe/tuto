# Spec 11 — Deployment y Operaciones

## Infraestructura

### Servicios
- **Vercel**: hosting Next.js, Server Actions, Edge runtime
- **Supabase Cloud**: Postgres, Auth, Storage, Realtime, Edge Functions
- **Resend**: envío de emails transaccionales
- **Upstash Redis** (opcional): rate limiting
- **Sentry**: monitoring y error tracking
- **GitHub**: source + CI/CD

### Ambientes

| Ambiente | Uso | URL ejemplo | DB |
|---|---|---|---|
| `local` | Desarrollo | `http://localhost:3000` | Supabase local (Docker) |
| `preview` | PRs | `preview-xxx.vercel.app` | Branch DB de Supabase |
| `staging` | Pre-prod | `staging.instituto.app` | Staging en Supabase Cloud |
| `production` | Producción | `instituto.app` | Production en Supabase Cloud |

---

## Variables de entorno

### `.env.example` (committed)

```env
# =============================================================================
# App
# =============================================================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Instituto Sistema"

# =============================================================================
# Supabase
# =============================================================================
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# =============================================================================
# Email (Resend)
# =============================================================================
RESEND_API_KEY=
EMAIL_FROM="Instituto <noreply@instituto.app>"
EMAIL_REPLY_TO=soporte@instituto.app

# =============================================================================
# Rate limiting (opcional, Upstash)
# =============================================================================
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# =============================================================================
# Monitoring
# =============================================================================
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# =============================================================================
# Feature flags
# =============================================================================
FEATURE_2FA_REQUIRED_STUDENTS=false
FEATURE_PDF_RECEIPTS=true
```

### `.env.local` (gitignored)
Copia de `.env.example` con valores reales para desarrollo.

### Vercel secrets
Configurar cada var en Vercel → Settings → Environment Variables:
- Selección por ambiente (preview, production)
- `NEXT_PUBLIC_*` disponibles en cliente
- El resto solo en runtime server

---

## Migraciones

### Flujo local

```bash
# Generar migración nueva
supabase migration new add_grades_table

# Editar el archivo en supabase/migrations/
# Aplicar localmente
supabase db reset  # borra + recorre todas
# o
supabase migration up
```

### Flujo a staging/production

**Opción A (recomendada): Supabase CLI en CI**

```yaml
# .github/workflows/deploy.yml
- name: Apply migrations to Supabase
  run: |
    supabase link --project-ref $PROJECT_REF
    supabase db push
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

**Opción B (al inicio): manual**

```bash
supabase db push --linked
```

### Reglas
- Toda migración debe ser reversible cuando sea razonable
- Incluir comentario con SQL de rollback
- **Nunca** editar una migración ya mergeada a main
- Nombre: `YYYYMMDDHHMMSS_descripcion.sql`
- Test de migración en Supabase local antes de push

---

## Deploy

### Preview deployments (automático)
Cada PR → Vercel crea preview + Supabase crea branch DB. Link de preview en el PR.

### Staging (manual trigger)
Merge a `main` → auto deploy a staging.

### Production (manual trigger con approval)
Workflow de GitHub Actions que:
1. Requiere aprobación manual
2. Corre migraciones
3. Deploy a Vercel production
4. Smoke tests post-deploy
5. Notifica en Slack / email

### Rollback
- Vercel: un click en la UI revierte deployment
- Supabase migrations: si corrompe data, se restaura de backup (ver más abajo)

---

## Backups

### Supabase
- Backups automáticos diarios (retención 7 días en plan Pro, 28 días en Team)
- Point-in-time recovery (PITR) opcional

### Custom backups
Para datos críticos (pagos, notas), job semanal que:
1. Export a XLSX las tablas `payments`, `receipts`, `grades`, `enrollments`
2. Sube a bucket S3 (o Supabase Storage) con retención 5 años
3. Cifrado en reposo

---

## Monitoring

### Sentry
- Captura errores del cliente y servidor
- Source maps uploaded en build
- Alertas Slack/email para errores P1
- Integración con `lib/logger.ts`

### Supabase Dashboard
- Queries lentas
- Logs de Postgres
- Storage usage
- Auth events

### Vercel Analytics
- Core Web Vitals
- Función invocations
- Errors por ruta

### Logs de negocio
- Activity log es la fuente principal de "qué pasó"
- Dashboard admin: `/a/audit` + `/a/audit/auth`
- Alertas custom (Fase 2): mora >60 días, fallos de email, etc.

---

## Performance

### Estrategias

**Server Components por defecto**: no se envía JS innecesario.

**Streaming**: `loading.tsx` y Suspense para UI progresiva.

**Cache de Next.js**:
- `revalidateTag` para invalidar caches específicos
- Evitar `cache: 'no-store'` excepto cuando es estrictamente necesario

**Postgres**:
- Índices en columnas de alta cardinalidad (ver spec 01)
- `EXPLAIN ANALYZE` en queries que toquen >10k filas
- Vistas materializadas para reportes agregados (Fase 5)

**Imágenes y PDFs**:
- `next/image` con optimización automática
- PDFs generados server-side, pero response stream para no bloquear

### Presupuestos
- TTFB < 500ms en P95
- LCP < 2.5s en P95
- Bundle JS del portal estudiante < 200KB gzipped

---

## Jobs programados

### Vercel Cron

```
# vercel.json
{
  "crons": [
    {
      "path": "/api/cron/send-due-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/process-notification-queue",
      "schedule": "*/2 * * * *"
    },
    {
      "path": "/api/cron/overdue-admin-digest",
      "schedule": "0 8 * * 1"
    },
    {
      "path": "/api/cron/cleanup-expired-sessions",
      "schedule": "0 3 * * *"
    }
  ]
}
```

### Protección
Endpoints `/api/cron/*` requieren header `Authorization: Bearer ${CRON_SECRET}` — Vercel lo agrega automáticamente si está configurado.

### Idempotencia
Cada job debe ser idempotente: si corre dos veces, no duplica notificaciones ni procesa lo mismo dos veces.

---

## Configuración de dominio

### Flujo
1. Registrar dominio (ej: `instituto.app`)
2. Agregar en Vercel → Domains
3. Configurar DNS:
   - `A` o `CNAME` al proyecto Vercel
   - `MX` para email (si usas email custom)
   - `TXT` SPF/DKIM de Resend
4. SSL automático por Vercel

### Multi-tenant subdomains (Fase 2)
Cuando haya múltiples tenants:
- `<tenant-slug>.instituto.app`
- Middleware resuelve tenant por subdomain
- DNS wildcard `*.instituto.app → Vercel`

---

## Compliance y legal

### MVP (Colombia)
- Política de privacidad publicada
- Términos y condiciones
- Consentimiento al crear cuenta
- Habeas Data según Ley 1581 de 2012

### No MVP (Fase 2+)
- DIAN para facturación electrónica
- Certificación ISO 27001 si se requiere por cliente corporativo

---

## Checklist pre-producción

### Antes del primer go-live

- [ ] Dominio registrado y apuntando a Vercel
- [ ] SSL activo (auto)
- [ ] Variables de entorno en Vercel production
- [ ] Supabase production creado con backups habilitados
- [ ] Resend con dominio verificado
- [ ] DNS: SPF, DKIM, DMARC configurados
- [ ] Sentry project creado y DSN en env vars
- [ ] Cron secret configurado en Vercel
- [ ] GitHub Actions con secrets necesarios
- [ ] Seed inicial: super_admin creado manualmente
- [ ] Tenant inicial creado con datos del instituto
- [ ] Pentest básico manual (ver spec 09 checklist)
- [ ] Política de privacidad publicada
- [ ] Términos y condiciones publicados
- [ ] Smoke tests post-deploy pasan
- [ ] Alertas de Sentry configuradas
- [ ] Runbook de incidentes documentado
- [ ] Contacto de soporte publicado
- [ ] Backup del día 1 verificado

---

## Runbook de incidentes

### "El sitio está caído"
1. Check Vercel status + Supabase status
2. Check Sentry por errores recientes
3. Check último deploy — si rompió algo, rollback en Vercel
4. Si es DB → escalar a admin Supabase

### "Nadie puede loguearse"
1. Check Supabase Auth status
2. Check si hay rate limiting global activado
3. Check `auth_events` por pattern
4. Si solo un tenant → posible tenant config corrupta, revisar

### "Los emails no llegan"
1. Check Resend dashboard
2. Check `email_deliveries` por status failed
3. Verificar límite de Resend no excedido
4. Verificar DNS SPF/DKIM

### "Data corrupta en pagos/notas"
1. **NO tocar nada en producción**
2. Query el audit table para saber qué cambió y quién
3. Si fue error humano → revert en UI con trazabilidad
4. Si fue bug → fix + post-mortem
5. Comunicar a usuarios afectados
