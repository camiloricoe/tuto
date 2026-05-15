import { test, expect } from '@playwright/test'

const SUFFIX = Date.now().toString(36).toUpperCase()

test.describe('Admin smoke', () => {
  test('dashboard renders with super admin badge', async ({ page }) => {
    await page.goto('/a')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByText('Super Admin').first()).toBeVisible()
  })

  test('tenants list with search', async ({ page }) => {
    await page.goto('/a/tenants')
    await expect(page.getByRole('heading', { name: 'Instituciones' })).toBeVisible()
    await expect(page.getByText('INDECAP')).toBeVisible()
    await page.getByPlaceholder(/buscar/i).fill('xyz_no_match_zzz')
    await page.getByPlaceholder(/buscar/i).press('Enter')
    await expect(page.getByText(/no hay instituciones que coincidan/i)).toBeVisible()
  })

  test('create academic program', async ({ page }) => {
    await page.goto('/a/academic/programs')
    await page.getByRole('link', { name: /nuevo programa/i }).first().click()
    await expect(page.getByRole('heading', { name: 'Nuevo Programa' })).toBeVisible()

    await page.getByLabel('Nombre').fill(`Programa Test ${SUFFIX}`)
    await page.getByLabel('Codigo').fill(`PROG_${SUFFIX}`)
    await page.getByLabel('Modalidad').selectOption('fixed_curriculum')
    await page.getByLabel('Duracion (periodos)').fill('8')
    await page.getByRole('button', { name: /crear programa/i }).click()

    await expect(page.getByText(/programa creado exitosamente/i)).toBeVisible({ timeout: 10_000 })
  })

  test('create payment concept', async ({ page }) => {
    await page.goto('/a/payments/concepts')
    await expect(page.getByRole('heading', { name: 'Conceptos de Pago' })).toBeVisible()

    await page.getByLabel('Nombre').fill(`Concepto Test ${SUFFIX}`)
    await page.getByLabel('Codigo').fill(`CONCEPT_${SUFFIX}`)
    await page.getByLabel('Monto por defecto').fill('100')
    await page.getByRole('button', { name: /agregar concepto/i }).click()

    await expect(page.getByText(/concepto creado exitosamente/i)).toBeVisible({ timeout: 10_000 })
  })

  test('users page renders with creator', async ({ page }) => {
    await page.goto('/a/users')
    await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible()
    await expect(page.getByText(/camilo|camilorico/i).first()).toBeVisible()
  })

  test('invite user form renders', async ({ page }) => {
    await page.goto('/a/users/new')
    await expect(page.getByRole('heading', { name: 'Invitar usuario' })).toBeVisible()
    await expect(page.getByLabel('Nombre completo')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Rol')).toBeVisible()
  })

  test('charges page renders', async ({ page }) => {
    await page.goto('/a/payments/charges')
    await expect(page.getByRole('heading', { name: 'Cargos de Estudiantes' })).toBeVisible()
  })

  test('payments page renders', async ({ page }) => {
    await page.goto('/a/payments')
    await expect(page.getByRole('heading', { name: 'Pagos Recientes' })).toBeVisible()
  })

  test('import page renders', async ({ page }) => {
    await page.goto('/a/import')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('settings page renders', async ({ page }) => {
    await page.goto('/a/settings')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('audit page renders with our recent program creation', async ({ page }) => {
    await page.goto('/a/audit')
    await expect(page.getByRole('heading', { name: 'Auditoria' })).toBeVisible()
    await expect(page.getByText(/vista global/i)).toBeVisible()
    await page.getByRole('combobox').first().selectOption('activity')
    await page.getByRole('button', { name: /filtrar/i }).click()
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 })
  })

  test('tenant switcher dropdown opens', async ({ page }) => {
    await page.goto('/a')
    await page.getByRole('button', { name: /indecap/i }).first().click()
    await expect(page.getByText(/todas las instituciones|tus instituciones/i)).toBeVisible()
  })

  test('theme toggle changes mode', async ({ page }) => {
    await page.goto('/a')
    const toggle = page.getByRole('button', { name: /cambiar tema/i })
    await toggle.click()
    await page.getByRole('menuitem', { name: /oscuro/i }).click()
    await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 5_000 })
  })
})
