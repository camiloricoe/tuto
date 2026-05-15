import { test, expect } from '@playwright/test'

// Per-role visibility of the seeded data.

test('[teacher] sees own course in /t/courses', async ({ page }) => {
  await page.goto('/t/courses')
  await expect(page.getByText('E2E Matematicas I')).toBeVisible({ timeout: 10_000 })
})

test('[student] dashboard shows enrolled course context', async ({ page }) => {
  await page.goto('/s')
  await expect(page.locator('header')).toContainText('Estudiante')
})

test('[student] sees enrolled course in /s/courses', async ({ page }) => {
  await page.goto('/s/courses')
  await expect(page.getByText('E2E Matematicas I')).toBeVisible({ timeout: 10_000 })
})

test('[student] sees published grade in /s/grades', async ({ page }) => {
  await page.goto('/s/grades')
  // grade value is 85
  await expect(page.getByText(/85/)).toBeVisible({ timeout: 10_000 })
})

test('[student] sees own payments + charges in /s/payments', async ({ page }) => {
  await page.goto('/s/payments')
  await expect(page.getByText('E2E Matricula')).toBeVisible({ timeout: 10_000 })
})
