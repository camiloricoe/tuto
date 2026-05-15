import { test, expect } from '@playwright/test'

test('dark mode toggle persists across navigation', async ({ page }) => {
  await page.goto('/a')
  await page.getByRole('button', { name: /cambiar tema/i }).click()
  await page.getByRole('menuitem', { name: /oscuro/i }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)

  await page.goto('/a/feedback')
  await expect(page.locator('html')).toHaveClass(/dark/)

  await page.goto('/a/users')
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('reset to light mode persists', async ({ page }) => {
  await page.goto('/a')
  await page.getByRole('button', { name: /cambiar tema/i }).click()
  await page.getByRole('menuitem', { name: /claro/i }).click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await page.goto('/a/users')
  await expect(page.locator('html')).not.toHaveClass(/dark/)
})

test('notification bell renders in admin header', async ({ page }) => {
  await page.goto('/a')
  await expect(page.locator('header').getByRole('button').filter({ has: page.locator('svg.lucide-bell') })).toBeVisible()
})

test('pdf receipt endpoint requires paymentId', async ({ page, request }) => {
  await page.goto('/a')
  // Forward cookies to API
  const cookies = await page.context().cookies()
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
  const response = await request.get('/api/pdf/receipt', { headers: { cookie: cookieHeader } })
  expect([400, 401, 403]).toContain(response.status())
})

test('pdf grade report endpoint requires courseId', async ({ page, request }) => {
  await page.goto('/a')
  const cookies = await page.context().cookies()
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
  const response = await request.get('/api/pdf/grade-report', { headers: { cookie: cookieHeader } })
  expect([400, 401, 403]).toContain(response.status())
})

test('user nav dropdown shows logout', async ({ page }) => {
  await page.goto('/a')
  await page.locator('header').getByRole('button').filter({ hasText: /camilo|admin|test/i }).first().click()
  await expect(page.getByRole('menuitem', { name: /cerrar sesion/i })).toBeVisible()
  // Close menu
  await page.keyboard.press('Escape')
})
