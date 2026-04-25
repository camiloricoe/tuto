# Prompt Inicial — Bootstrap (Fase 0)

> **Cómo usar:** pega el contenido de la sección `## Prompt` como primer mensaje en Claude Code después de clonar el repo con la documentación.

---

## Prompt

Hola. Voy a construir un sistema de gestión académica multi-tenant con vos. Todo el diseño, specs y plan de fases está en este repositorio.

**Antes de escribir código o correr comandos, hacé lo siguiente:**

1. **Leé estos archivos completos, en este orden:**
   - `CLAUDE.md` (reglas del proyecto, convenciones, anti-patrones)
   - `README.md`
   - `docs/phases/00-roadmap.md` (visión general del proyecto)
   - `docs/phases/phase-0-bootstrap.md` (plan detallado de esta fase)
   - `docs/specs/00-overview.md` (arquitectura)
   - `docs/specs/11-deployment-and-ops.md` (variables de entorno, estructura)

2. **Confirmá que entendiste los principios no negociables:**
   - TypeScript estricto sin `any`
   - Server Components por defecto
   - RLS desde día 1 (aunque en fase 0 casi no hay tablas)
   - Commits atómicos
   - Proponer plan antes de ejecutar

3. **Hacé las preguntas pendientes de Bootstrap.** Estas están listadas en `docs/phases/phase-0-bootstrap.md` sección "Decisiones pendientes". Son:
   - Nombre del proyecto (para `package.json`)
   - Nombre visible del app
   - Dominio de producción (si ya lo tienen)
   - Email de envío para Resend
   - Rate limiting: Upstash Redis o tabla Postgres?
   - Sentry desde día 1 o diferir a Fase 5?
   - Paleta de colores base (aproximada)

   Esperá mis respuestas antes de continuar.

4. **Una vez tengas claridad, proponé un plan detallado para Fase 0.** El plan debe incluir:
   - Secuencia exacta de comandos a ejecutar
   - Estructura final de carpetas
   - Lista de archivos que vas a crear (con 1 línea de descripción cada uno)
   - Variables de entorno requeridas
   - Qué va al `.env.example` vs `.env.local`
   - Configuración de CI
   - Criterios de done que vas a verificar al final

5. **Esperá mi aprobación.** No empieces a ejecutar hasta que te diga "dale" o "aprobado".

6. Durante la ejecución:
   - Commits pequeños y frecuentes con mensaje en inglés (Conventional Commits)
   - Si encontrás algo no cubierto en specs, preguntame
   - Si detectás deuda técnica o shortcuts, anotalos en `TECH_DEBT.md`
   - Después de cambios significativos: corré `pnpm typecheck && pnpm lint`

7. **Al terminar la fase:**
   - Corré `pnpm typecheck && pnpm lint && pnpm test`
   - Verificá todos los criterios de done de `phase-0-bootstrap.md`
   - Actualizá `docs/phases/00-roadmap.md` marcando Fase 0 como completada
   - Escribí un resumen de lo que hiciste listo para el PR

**Importante:**
- Esta fase es infraestructura únicamente. No implementes features de negocio, auth ni tablas de dominio. Eso viene en Fase 1.
- Los portales `(student)`, `(teacher)`, `(admin)` son solo layouts con placeholders en esta fase.

Arrancá leyendo los archivos y hacé las preguntas pendientes.
