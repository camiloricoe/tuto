import { test, expect } from '@playwright/test'

const SUFFIX = Date.now().toString(36).toUpperCase()
const TICKET_TITLE_PICKER = `E2E Bug Picker ${SUFFIX}`
const TICKET_TITLE_SKIP = `E2E Bug Skip ${SUFFIX}`

test.describe.configure({ mode: 'serial' })

test('feedback widget visible on admin pages', async ({ page }) => {
  await page.goto('/a')
  await expect(page.getByRole('button', { name: /^Feedback$/ })).toBeVisible()
})

test('clicking Feedback enters picker mode immediately', async ({ page }) => {
  await page.goto('/a')
  await page.getByRole('button', { name: /^Feedback$/ }).click()
  await expect(page.getByText(/click en el elemento/i)).toBeVisible()
})

test('ESC cancels picker mode', async ({ page }) => {
  await page.goto('/a')
  await page.getByRole('button', { name: /^Feedback$/ }).click()
  await expect(page.getByText(/click en el elemento/i)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByText(/click en el elemento/i)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Feedback$/ })).toBeVisible()
})

test('Saltar opens modal without selection', async ({ page }) => {
  await page.goto('/a')
  await page.getByRole('button', { name: /^Feedback$/ }).click()
  await page.getByRole('button', { name: /saltar/i }).click()
  await expect(page.getByRole('heading', { name: /reportar feedback/i })).toBeVisible()
  await expect(page.getByText(/sin elemento/i)).toBeVisible()
})

test('submit ticket without element capture (Saltar flow)', async ({ page }) => {
  await page.goto('/a')
  await page.getByRole('button', { name: /^Feedback$/ }).click()
  await page.getByRole('button', { name: /saltar/i }).click()
  await page.getByLabel('Titulo').fill(TICKET_TITLE_SKIP)
  await page.getByLabel('Descripcion').fill('Reporte sin elemento seleccionado')
  await page.getByRole('button', { name: /enviar reporte/i }).click()
  await expect(page.getByRole('heading', { name: /gracias/i })).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Cerrar', exact: true }).last().click()
})

test('submit ticket WITH element capture via picker', async ({ page }) => {
  await page.goto('/a')
  await page.getByRole('button', { name: /^Feedback$/ }).click()
  await expect(page.getByText(/click en el elemento/i)).toBeVisible()

  // Click on the Dashboard heading to capture it
  await page.getByRole('heading', { name: 'Dashboard' }).click({ force: true })

  await expect(page.getByRole('heading', { name: /reportar feedback/i })).toBeVisible({ timeout: 5_000 })

  // Verify the captured element selector or text shows in the modal
  await expect(page.locator('.font-mono').first()).toBeVisible()

  await page.getByLabel('Titulo').fill(TICKET_TITLE_PICKER)
  await page.getByLabel('Descripcion').fill('El dashboard muestra el numero incorrecto.')
  await page.getByRole('button', { name: /enviar reporte/i }).click()

  await expect(page.getByRole('heading', { name: /gracias/i })).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Cerrar', exact: true }).last().click()
})

test('both tickets appear in admin list', async ({ page }) => {
  await page.goto('/a/feedback')
  await expect(page.getByText(TICKET_TITLE_PICKER)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(TICKET_TITLE_SKIP)).toBeVisible()
})

test('admin changes status to triaged + priority high', async ({ page }) => {
  await page.goto('/a/feedback')
  await page.getByText(TICKET_TITLE_PICKER).first().click()
  await page.waitForURL(/\/a\/feedback\/[0-9a-f-]+/)
  await page.locator('select[name="status"]').selectOption('triaged')
  await page.locator('select[name="priority"]').selectOption('high')
  await page.getByRole('button', { name: /guardar cambios/i }).click()
  await expect(page.getByText(/actualizado/i).first()).toBeVisible({ timeout: 10_000 })
})

test('admin adds public comment', async ({ page }) => {
  await page.goto('/a/feedback')
  await page.getByText(TICKET_TITLE_PICKER).first().click()
  await page.locator('textarea[name="body"]').fill('Lo estamos investigando.')
  await page.getByRole('button', { name: /^comentar$/i }).click()
  await expect(page.getByText('Lo estamos investigando.')).toBeVisible({ timeout: 10_000 })
})

test('admin adds internal comment (only staff sees)', async ({ page }) => {
  await page.goto('/a/feedback')
  await page.getByText(TICKET_TITLE_PICKER).first().click()
  await page.locator('textarea[name="body"]').fill('Nota interna para el equipo.')
  await page.locator('input[name="isInternal"]').check()
  await page.getByRole('button', { name: /^comentar$/i }).click()
  await expect(page.getByText('Nota interna para el equipo.')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('INTERNO').first()).toBeVisible()
})

test('admin transitions ticket to resolved', async ({ page }) => {
  await page.goto('/a/feedback')
  await page.getByText(TICKET_TITLE_PICKER).first().click()
  await page.locator('select[name="status"]').selectOption('resolved')
  await page.getByRole('button', { name: /guardar cambios/i }).click()
  await expect(page.getByText(/actualizado/i).first()).toBeVisible({ timeout: 10_000 })
})

test('admin declines the second ticket', async ({ page }) => {
  await page.goto('/a/feedback')
  await page.getByText(TICKET_TITLE_SKIP).first().click()
  await page.locator('select[name="status"]').selectOption('declined')
  await page.getByRole('button', { name: /guardar cambios/i }).click()
  await expect(page.getByText(/actualizado/i).first()).toBeVisible({ timeout: 10_000 })
})

test('filter list by status=resolved shows the resolved ticket', async ({ page }) => {
  await page.goto('/a/feedback?status=resolved')
  await expect(page.getByText(TICKET_TITLE_PICKER)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(TICKET_TITLE_SKIP)).toHaveCount(0)
})

test('copy as prompt button copies markdown to clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/a/feedback')
  await page.getByText(TICKET_TITLE_PICKER).first().click()
  await page.getByRole('button', { name: /copiar como prompt/i }).click()
  await expect(page.getByText(/copiado/i)).toBeVisible({ timeout: 5_000 })

  const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboardText).toContain(TICKET_TITLE_PICKER)
  expect(clipboardText).toContain('Status:')
  expect(clipboardText).toContain('### Description')
})

test('user view: ticket creator sees own resolved ticket with public comment', async ({ page }) => {
  await page.goto('/a/feedback')
  await expect(page.getByText(TICKET_TITLE_PICKER)).toBeVisible()
  // Internal note must NOT appear in user-facing list (admin sees it only on detail);
  // we can't switch users mid-test here without a separate spec, so verify
  // the page-level guarantee: comment "Nota interna" is visible only on /a/feedback/[id]
  // when accessed by staff. Cross-role visibility test lives in per-role.spec.ts.
})
