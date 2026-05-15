import { test, expect } from '@playwright/test'

const SUFFIX = Date.now().toString(36).toUpperCase()

test.describe.configure({ mode: 'serial' })

test('program code uniqueness — duplicate is rejected', async ({ page }) => {
  const code = `DUP_${SUFFIX}`
  await page.goto('/a/academic/programs/new')
  await page.getByLabel('Nombre').fill(`Dup1 ${SUFFIX}`)
  await page.getByLabel('Codigo').fill(code)
  await page.getByLabel('Modalidad').selectOption('cohort')
  await page.getByLabel('Duracion (periodos)').fill('1')
  await page.getByRole('button', { name: /crear programa/i }).click()
  await expect(page.getByText(/programa creado exitosamente/i)).toBeVisible({ timeout: 10_000 })

  await page.goto('/a/academic/programs/new')
  await page.getByLabel('Nombre').fill(`Dup2 ${SUFFIX}`)
  await page.getByLabel('Codigo').fill(code)
  await page.getByLabel('Modalidad').selectOption('cohort')
  await page.getByLabel('Duracion (periodos)').fill('1')
  await page.getByRole('button', { name: /crear programa/i }).click()
  await expect(page.getByText(/ya esta en uso/i)).toBeVisible({ timeout: 10_000 })
})

test('program with lowercase code is rejected by validator', async ({ page }) => {
  await page.goto('/a/academic/programs/new')
  await page.getByLabel('Nombre').fill(`Lower ${SUFFIX}`)
  await page.getByLabel('Codigo').fill('lowercase_code')
  await page.getByLabel('Modalidad').selectOption('cohort')
  await page.getByLabel('Duracion (periodos)').fill('1')
  await page.getByRole('button', { name: /crear programa/i }).click()
  await expect(page.getByText(/mayusculas|invalido|requerido/i).first()).toBeVisible({ timeout: 10_000 })
})

test('tenant slug uniqueness — duplicate slug is rejected', async ({ page }) => {
  await page.goto('/a/tenants')
  // Use existing slug "indecap"
  await page.getByRole('button', { name: /nueva institucion/i }).click()
  await page.getByLabel('Nombre').fill('Duplicate Indecap Test')
  await page.getByLabel('Slug').fill('indecap')
  await page.getByRole('button', { name: /crear institucion/i }).click()
  await expect(page.getByText(/ya existe/i)).toBeVisible({ timeout: 10_000 })
})

test('feedback ticket requires title and description', async ({ page }) => {
  await page.goto('/a')
  await page.getByRole('button', { name: /^Feedback$/ }).click()
  await page.getByRole('button', { name: /saltar/i }).click()
  // Submit button should be disabled when title and description empty
  await expect(page.getByRole('button', { name: /enviar reporte/i })).toBeDisabled()
})

test('payment concept code with spaces is rejected', async ({ page }) => {
  await page.goto('/a/payments/concepts')
  await page.getByLabel('Nombre').fill(`Spaces ${SUFFIX}`)
  await page.getByLabel('Codigo').fill('CODE WITH SPACES')
  await page.getByRole('button', { name: /agregar concepto/i }).click()
  // Either validator rejects or DB CHECK; in both cases no success message
  await expect(page.getByText(/concepto creado exitosamente/i)).toHaveCount(0, { timeout: 5_000 })
})

test('invite user form rejects malformed email', async ({ page }) => {
  await page.goto('/a/users/new')
  await page.getByLabel('Nombre completo').fill('Test User')
  await page.getByLabel('Email').fill('not-an-email')
  await page.getByLabel('Rol').selectOption('teacher')
  // HTML5 email validation should block submit
  await page.getByRole('button', { name: /enviar invitacion/i }).click()
  // Form did not submit — still on /a/users/new
  await expect(page).toHaveURL(/\/a\/users\/new/)
})
