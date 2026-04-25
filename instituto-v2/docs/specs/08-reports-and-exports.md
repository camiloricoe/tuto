# Spec 08 — Reportes y Exportaciones

## Alcance MVP

4 tipos de salidas:

1. **Boletín de notas PDF** (por estudiante / período)
2. **Estado de cuenta PDF** (por estudiante)
3. **Reportes agregados para admin** (ingresos, morosos, promedios)
4. **Export genérico a Excel/CSV** (cualquier tabla/vista con filtros)

---

## 1. Boletín de notas PDF

### Disponible para
- Estudiante: solo el suyo.
- Admin / coordinator: cualquier estudiante del tenant.
- Profesor: de los estudiantes de sus cursos.

### Contenido
- Encabezado: logo + datos del tenant.
- Datos del estudiante: nombre, documento, programa, período.
- Tabla por curso:
  - Materia, profesor, grupo
  - Cada evaluación con peso y nota
  - Nota final + letra (si aplica)
  - Estado (aprobado / reprobado / en curso)
- Resumen: promedio general del período.
- Fecha de generación y sello digital "Este documento es informativo".

### Generación
- URL: `/s/reports/grades-report?period=<id>` (estudiante) o `/a/students/[id]/grades-report?period=<id>` (admin).
- Server Component que hace query y renderiza PDF con `@react-pdf/renderer`.
- Devuelve `Content-Type: application/pdf` como stream.
- No se guarda en Storage — se genera on-demand.

---

## 2. Estado de cuenta PDF

### Disponible para
- Estudiante: el suyo.
- Admin / treasurer: cualquier estudiante.

### Contenido
- Datos del tenant y estudiante.
- Tabla de cargos: concepto, período, monto, vencimiento, saldo.
- Tabla de pagos: fecha, monto, método, referencia, recibo #.
- Saldo actual destacado.
- Gráfico simple de estado (opcional, texto OK).

### Generación
Mismo approach que boletín: on-demand.

---

## 3. Reportes agregados para admin

### `/a/reports` — dashboard

Cards principales:
- **Ingresos del período actual**: total, vs período anterior (% cambio).
- **Cuentas por cobrar**: total pendiente, # estudiantes con mora.
- **Promedio general por programa**: listado con barras.
- **Cursos activos**: count.
- **Próximas publicaciones de notas**: cursos con evaluaciones pendientes cerca de su `due_on`.

### `/a/reports/income`
Reporte de ingresos:
- Filtros: rango de fechas, método, concepto, programa.
- Tabla con breakdown.
- Total al pie.
- Botón "Exportar XLSX".

### `/a/reports/overdue`
Reporte de mora:
- Lista de estudiantes con cargos `pending` vencidos.
- Días de mora, monto total en mora, último pago.
- Filtros: días de mora (1-15, 16-30, 30+), programa.
- Exportable.

### `/a/reports/academic-performance`
Rendimiento académico:
- Promedio por curso con # estudiantes y % aprobados.
- Filtros: programa, período.
- Drill-down: click en curso → lista de estudiantes con sus notas finales.

### Implementación
- Las vistas (`v_admin_income_summary`, etc.) devuelven los agregados.
- Si crece mucho: materialized views con refresh cada hora via cron.

---

## 4. Export genérico

### `/a/export`

Interfaz para admin (permiso `reports:export`):
1. Seleccionar entidad: Students, Enrollments, Payments, Charges, Grades, Audit logs.
2. Seleccionar columnas (checkbox; preset "recomendadas").
3. Aplicar filtros:
   - Rango de fechas (por `created_at` o columna configurable)
   - Programa, período, status, etc. (depende de la entidad)
4. Seleccionar formato: XLSX o CSV.
5. Botón "Generar export".

### Backend
- Server Action `generateExport(entity, columns, filters, format)`:
  - Valida permiso.
  - Valida que las columnas pedidas sean exportables (whitelist por entidad — no permitir exportar columnas sensibles como password hashes, etc.).
  - Ejecuta query paginada.
  - Si XLSX: usa `exceljs` para streaming.
  - Si CSV: simple streaming de texto.
  - Devuelve el archivo como stream.
- Logs: cada export queda en `activity_log` con entity, count de filas, y quién lo hizo.

### Límites
- Max 50,000 filas por export en MVP. Si se excede, error con sugerencia de aplicar filtros.
- Exports quedan registrados; si un admin exporta data de estudiantes, es auditable.

---

## Libraries

- PDFs: `@react-pdf/renderer` (instalado una sola vez, templates reutilizables).
- XLSX: `exceljs` (mejor que `xlsx` para streaming y control fino).
- CSV: manual, sin librería (es simple).

---

## Tests críticos

1. Boletín de un estudiante: la data coincide con las notas publicadas en BD.
2. Estado de cuenta: totales coinciden con suma de charges y payments.
3. Export XLSX con 10,000 filas no explota memoria (streaming).
4. Un admin con permiso `reports:export` puede exportar; un usuario sin el permiso recibe 403.
5. Estudiante no puede descargar boletín de otro (RLS + chequeo en action).
6. Columnas sensibles no aparecen en export genérico aunque se pidan.
