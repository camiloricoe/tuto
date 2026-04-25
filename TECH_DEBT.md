# Deuda Tecnica

Lista de shortcuts, decisiones diferidas y mejoras pendientes. Revisar antes de Fase 5.

## Formato
- **Fecha** — **Fase descubierta** — **Descripcion** — **Accion sugerida**

---

- **2026-04-21** — **Fase 0** — `@react-email/components` esta deprecated, evaluar reemplazo antes de Fase 1 — Verificar paquete sucesor en npm
- **2026-04-21** — **Fase 0** — ESLint 10 tiene peer dependency warnings con eslint-config-next plugins — Monitorear actualizaciones de eslint-config-next para compatibilidad
- **2026-04-21** — **Fase 0** — Supabase Cloud y Resend no configurados aun — Configurar antes de iniciar Fase 1
- **2026-04-21** — **Fase 0** — Dominio de produccion pendiente — Definir antes de Fase 5
- **2026-04-21** — **Fase 0** — Next.js 16 depreca `middleware.ts` en favor de `proxy.ts` — Migrar cuando Supabase SSR soporte el nuevo API de proxy
- **2026-04-21** — **Fase 0** — Sentry `disableLogger` deprecated, usar `webpack.treeshake.removeDebugLogging` (no soportado con Turbopack aun) — Migrar cuando Turbopack lo soporte
