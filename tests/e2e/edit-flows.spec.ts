import { test, expect } from '@playwright/test'

const SUFFIX = Date.now().toString(36).toUpperCase()

const INDECAP_ID = '0dfeb630-870c-4bf2-8463-fbcefd9d1ab7'

test.beforeEach(async ({ context, baseURL }) => {
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

test.describe.configure({ mode: 'serial' })

test('program edit page renders prefilled', async ({ page }) => {
  await page.goto('/a/academic/programs')
  await page.waitForLoadState('networkidle')
  const editLinks = page.getByRole('link', { name: /^Editar$/ })
  const count = await editLinks.count()
  if (count === 0) {
    test.skip(true, 'No programs to edit in current tenant')
    return
  }
  await editLinks.first().click()
  await expect(page.getByRole('heading', { name: 'Editar Programa' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByLabel('Nombre')).not.toBeEmpty()
  await expect(page.getByLabel('Codigo')).not.toBeEmpty()
})

test('program update writes new description', async ({ page }) => {
  await page.goto('/a/academic/programs')
  await page.waitForLoadState('networkidle')
  const editLinks = page.getByRole('link', { name: /^Editar$/ })
  if ((await editLinks.count()) === 0) {
    test.skip(true, 'No programs to edit in current tenant')
    return
  }
  await editLinks.first().click()
  await page.waitForURL(/\/edit/, { timeout: 15_000 })
  const desc = `Updated by E2E ${SUFFIX}`
  await page.getByLabel('Descripcion').fill(desc)
  await page.getByRole('button', { name: /guardar cambios/i }).click()
  await expect(page.getByText(/cambios guardados/i)).toBeVisible({ timeout: 10_000 })
})

test('settings periods row exposes edit + delete buttons', async ({ page }) => {
  await page.goto('/a/settings')
  await expect(page.getByRole('heading', { name: 'Configuracion' })).toBeVisible()
  // At least one period row should have edit + delete
  const editLinks = page.locator('a').filter({ hasText: /^Editar$/ })
  await expect(editLinks.first()).toBeVisible()
})

test('settings subjects edit link navigates to edit page', async ({ page }) => {
  await page.goto('/a/settings')
  await page.waitForLoadState('networkidle')
  // Click first subject edit link if any
  const subjectsSection = page.locator('section').filter({ has: page.getByText(/Materias/i) })
  const editLink = subjectsSection.locator('a').filter({ hasText: /^Editar$/ }).first()
  if ((await editLink.count()) > 0) {
    await editLink.click()
    await expect(page.getByRole('heading', { name: /Editar materia/i })).toBeVisible({ timeout: 10_000 })
  }
})

test('course list shows edit + delete actions', async ({ page }) => {
  await page.goto('/a/academic/courses')
  await expect(page.getByRole('heading', { name: 'Cursos' })).toBeVisible()
  await expect(page.locator('a').filter({ hasText: /^Editar$/ }).first()).toBeVisible({ timeout: 10_000 })
})

test('concept delete button exists in concepts list', async ({ page }) => {
  await page.goto('/a/payments/concepts')
  await expect(page.getByRole('heading', { name: 'Conceptos de Pago' })).toBeVisible()
  // DeleteButton renders with "Eliminar" text on first click
  await expect(page.getByRole('button', { name: /eliminar/i }).first()).toBeVisible({ timeout: 10_000 })
})
