import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

test('switcher lists multiple tenants for super admin', async ({ page }) => {
  await page.goto('/a')
  await page.getByRole('button', { name: /indecap|seleccionar tenant/i }).first().click()
  await expect(page.getByText('INDECAP')).toBeVisible()
  await expect(page.getByText('E2E Iso Tenant')).toBeVisible()
})

test('switching to iso tenant changes active tenant pill', async ({ page }) => {
  await page.goto('/a')
  await page.getByRole('button', { name: /indecap|seleccionar tenant/i }).first().click()
  await page.getByRole('menuitem').filter({ hasText: 'E2E Iso Tenant' }).click()
  await page.waitForLoadState('networkidle')
  await expect(page.locator('header').getByRole('button', { name: /e2e iso tenant/i })).toBeVisible({ timeout: 10_000 })
})

test('iso tenant programs page shows ISO-only program', async ({ page }) => {
  await page.goto('/a/academic/programs')
  await expect(page.getByText('PROGRAMA_SOLO_ISO')).toBeVisible({ timeout: 10_000 })
})

test('switching back to INDECAP hides ISO-only program', async ({ page }) => {
  await page.goto('/a')
  await page.locator('header').getByRole('button', { name: /e2e iso tenant/i }).click()
  await page.getByRole('menuitem').filter({ hasText: 'INDECAP' }).click()
  await page.waitForLoadState('networkidle')
  await page.goto('/a/academic/programs')
  await expect(page.getByText('PROGRAMA_SOLO_ISO')).toHaveCount(0)
  await expect(page.locator('header').getByRole('button', { name: /indecap/i })).toBeVisible()
})

test('audit page shows tenant switch event when super admin', async ({ page }) => {
  await page.goto('/a/audit?days=1&resource=tenant')
  await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/tenant\.switch|cambio de tenant/i).first()).toBeVisible()
})

test('audit page reveals events from multiple tenants for super admin', async ({ page }) => {
  await page.goto('/a/audit?days=7')
  await expect(page.getByText(/vista global/i)).toBeVisible()
  // Tenant column is rendered in the header
  await expect(page.getByRole('columnheader', { name: /tenant/i })).toBeVisible()
})
