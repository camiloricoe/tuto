import { test, expect } from '@playwright/test'

const SUFFIX = Date.now().toString(36).toUpperCase()
const TICKET_TITLE = `E2E Bug ${SUFFIX}`

test.describe.configure({ mode: 'serial' })

test('feedback widget visible on admin pages', async ({ page }) => {
  await page.goto('/a')
  await expect(page.getByRole('button', { name: /^Feedback$/ })).toBeVisible()
})

test('submit a feedback ticket from admin', async ({ page }) => {
  await page.goto('/a')
  await page.getByRole('button', { name: /^Feedback$/ }).click()
  await expect(page.getByRole('heading', { name: /reportar feedback/i })).toBeVisible()

  await page.getByLabel('Titulo').fill(TICKET_TITLE)
  await page.getByLabel('Descripcion').fill('Pasos: 1. abrir 2. romper. Esperado: nada. Real: bug.')
  await page.getByRole('button', { name: /enviar reporte/i }).click()

  await expect(page.getByRole('heading', { name: /gracias/i })).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: /cerrar/i }).click()
})

test('ticket appears in admin feedback list', async ({ page }) => {
  await page.goto('/a/feedback')
  await expect(page.getByText(TICKET_TITLE)).toBeVisible({ timeout: 10_000 })
})

test('admin can change ticket status', async ({ page }) => {
  await page.goto('/a/feedback')
  await page.getByText(TICKET_TITLE).first().click()
  await page.waitForURL(/\/a\/feedback\/[0-9a-f-]+/)
  await page.locator('select[name="status"]').selectOption('triaged')
  await page.locator('select[name="priority"]').selectOption('high')
  await page.getByRole('button', { name: /guardar cambios/i }).click()
  await expect(page.getByText(/actualizado/i).first()).toBeVisible({ timeout: 10_000 })
})

test('admin can add a public comment', async ({ page }) => {
  await page.goto('/a/feedback')
  await page.getByText(TICKET_TITLE).first().click()
  const textarea = page.locator('textarea[name="body"]')
  await textarea.fill('Recibido, lo revisamos.')
  await page.getByRole('button', { name: /^comentar$/i }).click()
  await expect(page.getByText('Recibido, lo revisamos.')).toBeVisible({ timeout: 10_000 })
})

test('copy as prompt button is present', async ({ page }) => {
  await page.goto('/a/feedback')
  await page.getByText(TICKET_TITLE).first().click()
  await expect(page.getByRole('button', { name: /copiar como prompt/i })).toBeVisible()
})
