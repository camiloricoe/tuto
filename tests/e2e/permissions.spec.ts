import { test, expect } from '@playwright/test'

// Forbidden routes per role - hitting these should NOT render the page successfully
// The middleware/layout should redirect to user's portal OR throw a forbidden error
async function expectBlocked(page: import('@playwright/test').Page, urlBefore: string, fallbackPortal: string) {
  await page.goto(urlBefore)
  // Wait until either redirected away OR error boundary shown
  await page.waitForLoadState('domcontentloaded')
  const finalUrl = page.url()
  if (!finalUrl.includes(urlBefore) || finalUrl.includes(fallbackPortal)) {
    expect(finalUrl).toContain(fallbackPortal)
  } else {
    // Same URL — must show error boundary
    await expect(page.getByText(/algo salio mal|sin permisos|forbidden|permiso requerido/i)).toBeVisible({ timeout: 10_000 })
  }
}

// ─── teacher cannot access admin pages ─────────────────────────────────────────
test('[teacher] cannot access /a/users', async ({ page }) => {
  await expectBlocked(page, '/a/users', '/t')
})

test('[teacher] cannot access /a/academic/programs', async ({ page }) => {
  await expectBlocked(page, '/a/academic/programs', '/t')
})

test('[teacher] cannot access /a/payments', async ({ page }) => {
  await expectBlocked(page, '/a/payments', '/t')
})

test('[teacher] cannot access /a/settings', async ({ page }) => {
  await expectBlocked(page, '/a/settings', '/t')
})

test('[teacher] cannot access /a/audit', async ({ page }) => {
  await expectBlocked(page, '/a/audit', '/t')
})

test('[teacher] cannot access /a/feedback', async ({ page }) => {
  await expectBlocked(page, '/a/feedback', '/t')
})

test('[teacher] cannot access /a/tenants', async ({ page }) => {
  await expectBlocked(page, '/a/tenants', '/t')
})

// ─── student cannot access admin or teacher pages ──────────────────────────────
test('[student] cannot access /a', async ({ page }) => {
  await expectBlocked(page, '/a', '/s')
})

test('[student] cannot access /t', async ({ page }) => {
  await expectBlocked(page, '/t', '/s')
})

test('[student] cannot access /a/users', async ({ page }) => {
  await expectBlocked(page, '/a/users', '/s')
})

test('[student] cannot access /a/payments/charges', async ({ page }) => {
  await expectBlocked(page, '/a/payments/charges', '/s')
})

test('[student] cannot access /t/courses', async ({ page }) => {
  await expectBlocked(page, '/t/courses', '/s')
})

// ─── coordinator can read academic, but cannot write payments ──────────────────
test('[coordinator] CAN access programs page', async ({ page }) => {
  await page.goto('/a/academic/programs')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('[coordinator] CANNOT see Invitar usuario button (no users:invite)', async ({ page }) => {
  await page.goto('/a/users')
  await expect(page.getByRole('button', { name: /invitar usuario/i }).or(page.getByRole('link', { name: /invitar usuario/i }))).toHaveCount(0)
})

test('[coordinator] CANNOT access /a/audit (no audit:read)', async ({ page }) => {
  await page.goto('/a/audit')
  await expect(page.getByText(/algo salio mal|permiso requerido/i)).toBeVisible({ timeout: 10_000 })
})

test('[coordinator] CANNOT see Instituciones nav', async ({ page }) => {
  await page.goto('/a')
  await expect(page.getByRole('link', { name: 'Instituciones' })).toHaveCount(0)
})

// ─── treasurer can payments, blocked from academic write ───────────────────────
test('[treasurer] CAN access payment concepts', async ({ page }) => {
  await page.goto('/a/payments/concepts')
  await expect(page.getByRole('heading', { name: 'Conceptos de Pago' })).toBeVisible()
})

test('[treasurer] CAN access charges page', async ({ page }) => {
  await page.goto('/a/payments/charges')
  await expect(page.getByRole('heading', { name: 'Cargos de Estudiantes' })).toBeVisible()
})

test('[treasurer] CANNOT access programs new (no academic:write)', async ({ page }) => {
  await page.goto('/a/academic/programs/new')
  await expect(page.getByText(/algo salio mal|permiso requerido/i)).toBeVisible({ timeout: 10_000 })
})

test('[treasurer] CANNOT access /a/settings (no academic:write)', async ({ page }) => {
  await page.goto('/a/settings')
  await expect(page.getByText(/algo salio mal|permiso requerido/i)).toBeVisible({ timeout: 10_000 })
})

test('[treasurer] CANNOT see Instituciones nav', async ({ page }) => {
  await page.goto('/a')
  await expect(page.getByRole('link', { name: 'Instituciones' })).toHaveCount(0)
})

// ─── admin (tenant) sees most things but not Instituciones ─────────────────────
test('[admin] CAN access /a/users and see invite button', async ({ page }) => {
  await page.goto('/a/users')
  await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible()
  // admin role has users:invite per seed
  await expect(page.getByRole('link', { name: /invitar usuario/i })).toBeVisible()
})

test('[admin] CAN access /a/feedback', async ({ page }) => {
  await page.goto('/a/feedback')
  await expect(page.getByRole('heading', { name: /^Feedback/ })).toBeVisible()
})

test('[admin] CANNOT access /a/tenants page', async ({ page }) => {
  await page.goto('/a/tenants')
  await expect(page.getByText(/algo salio mal|permiso requerido/i)).toBeVisible({ timeout: 10_000 })
})

test('[admin] CANNOT see Instituciones nav', async ({ page }) => {
  await page.goto('/a')
  await expect(page.getByRole('link', { name: 'Instituciones' })).toHaveCount(0)
})
