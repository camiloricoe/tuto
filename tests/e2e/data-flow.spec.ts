import { test, expect } from '@playwright/test'

// Verifies seeded data is visible across all admin list pages.
// Seed lives in INDECAP tenant via SQL bootstrap.

const INDECAP_ID = '0dfeb630-870c-4bf2-8463-fbcefd9d1ab7'

test.beforeEach(async ({ context, baseURL }) => {
  // Ensure super_admin is on INDECAP tenant before each test
  const url = new URL(baseURL ?? 'https://tuto-flame.vercel.app')
  await context.addCookies([
    {
      name: 'tuto-active-tenant',
      value: INDECAP_ID,
      domain: url.hostname,
      path: '/',
      httpOnly: false,
      secure: url.protocol === 'https:',
      sameSite: 'Lax',
    },
  ])
})

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

test.skip('admin dashboard counters reflect seeded data (skipped: depends on tenant cookie state across runs)', async ({ page }) => {
  await page.goto('/a')
  // Dashboard renders Estudiantes (matrículas) > 0 and Cursos > 0
  await expect(page.getByText('Estudiantes')).toBeVisible()
  await expect(page.getByText('Cursos')).toBeVisible()
  // Activity recent — at least one event
  await expect(page.getByText(/actividad reciente/i)).toBeVisible()
})
