import { test, expect } from '@playwright/test'

test('[admin] lands on admin portal and sees dashboard', async ({ page }) => {
  await page.goto('/')
  await page.waitForURL('**/a', { timeout: 10_000 })
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

test('[admin] can access feedback list', async ({ page }) => {
  await page.goto('/a/feedback')
  await expect(page.getByRole('heading', { name: /^Feedback/ })).toBeVisible()
})

test('[admin] cannot see Instituciones nav (super-admin only)', async ({ page }) => {
  await page.goto('/a')
  await expect(page.getByRole('link', { name: 'Instituciones' })).toHaveCount(0)
})

test('[coordinator] lands on admin portal', async ({ page }) => {
  await page.goto('/')
  await page.waitForURL('**/a', { timeout: 10_000 })
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

test('[coordinator] can access academic programs', async ({ page }) => {
  await page.goto('/a/academic/programs')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('[treasurer] lands on admin portal and accesses payments', async ({ page }) => {
  await page.goto('/')
  await page.waitForURL('**/a', { timeout: 10_000 })
  await page.goto('/a/payments/concepts')
  await expect(page.getByRole('heading', { name: 'Conceptos de Pago' })).toBeVisible()
})

test('[teacher] lands on teacher portal', async ({ page }) => {
  await page.goto('/')
  await page.waitForURL('**/t', { timeout: 10_000 })
  await expect(page.locator('header')).toContainText('Profesor')
})

test('[teacher] can list own courses', async ({ page }) => {
  await page.goto('/t/courses')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('[teacher] sees Mis tickets in nav', async ({ page }) => {
  await page.goto('/t')
  await expect(page.getByRole('link', { name: /mis tickets/i })).toBeVisible()
})

test('[student] lands on student portal', async ({ page }) => {
  await page.goto('/')
  await page.waitForURL('**/s', { timeout: 10_000 })
  await expect(page.locator('header')).toContainText('Estudiante')
})

test('[student] cannot access admin pages', async ({ page }) => {
  await page.goto('/a/users')
  await page.waitForURL((url) => !url.pathname.startsWith('/a/users'), { timeout: 10_000 })
  expect(page.url()).toContain('/s')
})

test('[student] can view own feedback list', async ({ page }) => {
  await page.goto('/s/feedback')
  await expect(page.getByRole('heading', { name: 'Mis tickets' })).toBeVisible()
})
