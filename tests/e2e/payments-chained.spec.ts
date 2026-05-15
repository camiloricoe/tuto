import { test, expect } from '@playwright/test'

const SUFFIX = Date.now().toString(36).toUpperCase()
const CONCEPT_NAME = `E2E Concept ${SUFFIX}`
const CONCEPT_CODE = `E2E_CON_${SUFFIX}`

test.describe.configure({ mode: 'serial' })

test('treasurer creates a payment concept', async ({ page }) => {
  await page.goto('/a/payments/concepts')
  await expect(page.getByRole('heading', { name: 'Conceptos de Pago' })).toBeVisible()

  await page.getByLabel('Nombre').fill(CONCEPT_NAME)
  await page.getByLabel('Codigo').fill(CONCEPT_CODE)
  await page.getByLabel('Monto por defecto').fill('250')
  await page.getByRole('button', { name: /agregar concepto/i }).click()
  await expect(page.getByText(/concepto creado exitosamente/i)).toBeVisible({ timeout: 10_000 })
})

test('treasurer can list charges', async ({ page }) => {
  await page.goto('/a/payments/charges')
  await expect(page.getByRole('heading', { name: 'Cargos de Estudiantes' })).toBeVisible()
})

test('treasurer can list payments', async ({ page }) => {
  await page.goto('/a/payments')
  await expect(page.getByRole('heading', { name: 'Pagos Recientes' })).toBeVisible()
})

test('concept appears in concepts list', async ({ page }) => {
  await page.goto('/a/payments/concepts')
  await expect(page.getByText(CONCEPT_NAME)).toBeVisible({ timeout: 10_000 })
})
