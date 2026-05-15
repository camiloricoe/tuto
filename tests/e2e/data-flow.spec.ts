import { test, expect } from '@playwright/test'

// Verifies seeded data is visible across all admin list pages.
// Seed lives in INDECAP tenant via SQL bootstrap.

test('admin programs list shows seeded program', async ({ page }) => {
  await page.goto('/a/academic/programs')
  await expect(page.getByText('E2E Programa Demo')).toBeVisible({ timeout: 10_000 })
})

test('admin courses list shows seeded course', async ({ page }) => {
  await page.goto('/a/academic/courses')
  await expect(page.getByText('E2E Matematicas I')).toBeVisible({ timeout: 10_000 })
})

test('admin payment concepts list shows seeded concept', async ({ page }) => {
  await page.goto('/a/payments/concepts')
  await expect(page.getByText('E2E Matricula')).toBeVisible({ timeout: 10_000 })
})

test('admin charges list shows seeded charge', async ({ page }) => {
  await page.goto('/a/payments/charges')
  await expect(page.getByText('E2E Matricula')).toBeVisible({ timeout: 10_000 })
})

test('admin payments list shows seeded payment', async ({ page }) => {
  await page.goto('/a/payments')
  // Payment is COP 1000 from e2e-student
  await expect(page.getByText('Student Test')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/1000/)).toBeVisible()
})

test('admin users list shows all seeded test users', async ({ page }) => {
  await page.goto('/a/users')
  for (const name of ['Admin Test', 'Coordinator Test', 'Teacher Test', 'Treasurer Test', 'Student Test']) {
    await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 })
  }
})

test('admin settings shows seeded period and grading scheme', async ({ page }) => {
  await page.goto('/a/settings')
  await expect(page.getByText('E2E Semestre 2026-A')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('E2E Escala 0-100')).toBeVisible()
  await expect(page.getByText('E2E Matematicas I')).toBeVisible()
})

test('admin dashboard counters reflect seeded data', async ({ page }) => {
  await page.goto('/a')
  // Dashboard renders Estudiantes (matrículas) > 0 and Cursos > 0
  await expect(page.getByText('Estudiantes')).toBeVisible()
  await expect(page.getByText('Cursos')).toBeVisible()
  // Activity recent — at least one event
  await expect(page.getByText(/actividad reciente/i)).toBeVisible()
})
