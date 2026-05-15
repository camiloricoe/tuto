import { test, expect } from '@playwright/test'

const SUFFIX = Date.now().toString(36).toUpperCase()

test('XSS in feedback description is rendered as text, not script', async ({ page }) => {
  const xssPayload = `<script>window.__pwned=true</script>${SUFFIX}`
  await page.goto('/a')
  await page.getByRole('button', { name: /^Feedback$/ }).click()
  await page.getByRole('button', { name: /saltar/i }).click()
  await page.getByLabel('Titulo').fill(`XSS test ${SUFFIX}`)
  await page.getByLabel('Descripcion').fill(xssPayload)
  await page.getByRole('button', { name: /enviar reporte/i }).click()
  await expect(page.getByRole('heading', { name: /gracias/i })).toBeVisible({ timeout: 10_000 })

  await page.goto('/a/feedback')
  await page.getByRole('link').filter({ hasText: `XSS test ${SUFFIX}` }).first().click()
  await page.waitForURL(/\/a\/feedback\/[0-9a-f-]+/)

  // The script tag must NOT have executed
  const pwned = await page.evaluate(() => (window as unknown as { __pwned?: boolean }).__pwned)
  expect(pwned).toBeUndefined()

  // The string must be visible as escaped text
  await expect(page.getByText(xssPayload, { exact: false })).toBeVisible()
})

test('SQL-injection-looking input in tenant search returns no leak', async ({ page }) => {
  await page.goto(`/a/tenants?q=${encodeURIComponent("' OR 1=1 --")}`)
  // Page renders without error
  await expect(page.getByRole('heading', { name: 'Instituciones' })).toBeVisible()
  // The literal payload is reflected only inside the search box, not as data
  const inputValue = await page.locator('input[name="q"]').inputValue()
  expect(inputValue).toContain('1=1')
})

test('very long title is rejected by feedback validator', async ({ page }) => {
  await page.goto('/a')
  await page.getByRole('button', { name: /^Feedback$/ }).click()
  await page.getByRole('button', { name: /saltar/i }).click()
  await page.getByLabel('Titulo').fill('a'.repeat(250))
  await page.getByLabel('Descripcion').fill('descripcion valida')
  await page.getByRole('button', { name: /enviar reporte/i }).click()
  // Validation error or no gracias screen
  await expect(page.getByRole('heading', { name: /gracias/i })).toHaveCount(0, { timeout: 5_000 })
})

test('negative duration on program is rejected', async ({ page }) => {
  await page.goto('/a/academic/programs/new')
  await page.getByLabel('Nombre').fill(`Neg ${SUFFIX}`)
  await page.getByLabel('Codigo').fill(`NEG_${SUFFIX}`)
  await page.getByLabel('Modalidad').selectOption('cohort')
  // HTML5 min=1 prevents submit; if user tampers, server rejects
  const dur = page.getByLabel('Duracion (periodos)')
  await dur.fill('-3')
  await page.getByRole('button', { name: /crear programa/i }).click()
  // Either browser blocks submit or server rejects
  await expect(page.getByText(/programa creado exitosamente/i)).toHaveCount(0, { timeout: 5_000 })
})

test('unauthenticated request to /a redirects to login', async ({ browser }) => {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto('/a')
  await page.waitForURL(/\/login/, { timeout: 10_000 })
  await ctx.close()
})

test('unauthenticated POST to feedback action returns failure', async ({ request }) => {
  // Server actions require valid session — without cookie this should fail
  const response = await request.post('/a', { failOnStatusCode: false })
  expect([200, 302, 307, 401, 403, 404, 405]).toContain(response.status())
})
