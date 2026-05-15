import { test, expect } from '@playwright/test'

const SUFFIX = Date.now().toString(36).toUpperCase()
const PROGRAM_NAME = `AuditProg_${SUFFIX}`
const PROGRAM_CODE = `AUDIT_${SUFFIX}`
const CONCEPT_NAME = `AuditConcept_${SUFFIX}`
const CONCEPT_CODE = `AUDIT_C_${SUFFIX}`

test.describe.configure({ mode: 'serial' })

test('create program, verify audit log entry shows up', async ({ page }) => {
  await page.goto('/a/academic/programs/new')
  await page.getByLabel('Nombre').fill(PROGRAM_NAME)
  await page.getByLabel('Codigo').fill(PROGRAM_CODE)
  await page.getByLabel('Modalidad').selectOption('cohort')
  await page.getByLabel('Duracion (periodos)').fill('2')
  await page.getByRole('button', { name: /crear programa/i }).click()
  await expect(page.getByText(/programa creado exitosamente/i)).toBeVisible({ timeout: 10_000 })

  await page.goto(`/a/audit?days=1&resource=academic_program&q=${PROGRAM_NAME}`)
  await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(PROGRAM_NAME)).toBeVisible()
  await expect(page.getByText(/academic_program\.created/i)).toBeVisible()
})

test('create payment concept, verify audit log entry', async ({ page }) => {
  await page.goto('/a/payments/concepts')
  await page.getByLabel('Nombre').fill(CONCEPT_NAME)
  await page.getByLabel('Codigo').fill(CONCEPT_CODE)
  await page.getByLabel('Monto por defecto').fill('500')
  await page.getByRole('button', { name: /agregar concepto/i }).click()
  await expect(page.getByText(/concepto creado exitosamente/i)).toBeVisible({ timeout: 10_000 })

  await page.goto(`/a/audit?days=1&resource=payment_concept&q=${CONCEPT_NAME}`)
  await expect(page.getByText(CONCEPT_NAME)).toBeVisible({ timeout: 10_000 })
})

test('tenant switch event recorded in audit log', async ({ page }) => {
  await page.goto('/a')
  await page.locator('header').getByRole('button').filter({ hasText: /indecap|e2e iso/i }).first().click()
  const otherOption = page.getByRole('menuitem').filter({ hasText: /e2e iso|indecap/i }).first()
  await otherOption.click()
  await page.waitForLoadState('networkidle')

  await page.goto('/a/audit?days=1&resource=tenant')
  await expect(page.getByText(/tenant\.switch|cambio de tenant/i).first()).toBeVisible({ timeout: 10_000 })
})

test('feedback creation appears in audit log', async ({ page }) => {
  const title = `AuditFeedback_${SUFFIX}`
  await page.goto('/a')
  await page.getByRole('button', { name: /^Feedback$/ }).click()
  await page.getByRole('button', { name: /saltar/i }).click()
  await page.getByLabel('Titulo').fill(title)
  await page.getByLabel('Descripcion').fill('descripcion de auditoria')
  await page.getByRole('button', { name: /enviar reporte/i }).click()
  await expect(page.getByRole('heading', { name: /gracias/i })).toBeVisible({ timeout: 10_000 })

  await page.goto(`/a/audit?days=1&resource=feedback&q=${title}`)
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/feedback\.created/i)).toBeVisible()
})

test('audit page filter days reduces result set', async ({ page }) => {
  await page.goto('/a/audit?days=1')
  const rowsDay1 = await page.locator('table tbody tr').count()
  await page.goto('/a/audit?days=90')
  const rows90 = await page.locator('table tbody tr').count()
  expect(rows90).toBeGreaterThanOrEqual(rowsDay1)
})

test('audit auth source toggles to auth_events table', async ({ page }) => {
  await page.goto('/a/audit?source=auth&days=7')
  // Eventos de Auth heading
  await expect(page.getByRole('heading', { name: /eventos de auth/i })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Evento' })).toBeVisible()
})
