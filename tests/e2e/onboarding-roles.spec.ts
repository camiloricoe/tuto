import { test, expect, type Page } from '@playwright/test'

async function expectWidgetAndWelcome(page: Page, welcomePath: string) {
  // Visit portal landing — widget should be in sidebar
  const portalRoot = welcomePath.replace('/welcome', '')
  await page.goto(portalRoot)
  await expect(page.getByTestId('milestone-widget')).toBeVisible()

  // Welcome page renders progress + list
  await page.goto(welcomePath)
  await expect(page.getByRole('heading', { name: 'Primeros pasos' })).toBeVisible()
  await expect(page.getByTestId('milestone-progress-summary')).toBeVisible()
  await expect(page.getByTestId('milestone-list')).toBeVisible()

  const items = page.locator('[data-testid^="milestone-item-"]')
  expect(await items.count()).toBeGreaterThan(0)
}

// ─── admin ───
test('[admin] sidebar widget + welcome page render', async ({ page }) => {
  await expectWidgetAndWelcome(page, '/a/welcome')
  await expect(page.getByText('Administrador').first()).toBeVisible()
})

test('[admin] dismiss + restore round-trip', async ({ page }) => {
  await page.goto('/a/welcome')
  const code = 'admin.subdomain_configured'
  const item = page.getByTestId(`milestone-item-${code}`)
  if (await item.count() === 0) {
    test.skip(true, 'milestone not present for this admin role tenant')
    return
  }
  const completed = await item.getAttribute('data-completed')
  if (completed === 'true') {
    test.skip(true, 'milestone already completed')
    return
  }
  await page.getByTestId(`milestone-dismiss-${code}`).click()
  await expect(item).toHaveAttribute('data-dismissed', 'true', { timeout: 10_000 })
  await page.getByTestId(`milestone-restore-${code}`).click()
  await expect(item).toHaveAttribute('data-dismissed', 'false', { timeout: 10_000 })
})

// ─── coordinator ───
test('[coordinator] sidebar widget + welcome page render', async ({ page }) => {
  await expectWidgetAndWelcome(page, '/a/welcome')
  await expect(page.getByText('Coordinador').first()).toBeVisible()
})

test('[coordinator] welcome page shows coordinator-specific milestones', async ({ page }) => {
  await page.goto('/a/welcome')
  // Every coordinator milestone code starts with "coordinator."
  const items = page.locator('[data-testid^="milestone-item-coordinator."]')
  expect(await items.count()).toBeGreaterThan(0)
})

// ─── treasurer ───
test('[treasurer] sidebar widget + welcome page render', async ({ page }) => {
  await expectWidgetAndWelcome(page, '/a/welcome')
  await expect(page.getByText('Tesoreria').first()).toBeVisible()
})

test('[treasurer] welcome page shows treasurer-specific milestones', async ({ page }) => {
  await page.goto('/a/welcome')
  const items = page.locator('[data-testid^="milestone-item-treasurer."]')
  expect(await items.count()).toBeGreaterThan(0)
})

// ─── teacher ───
test('[teacher] sidebar widget + welcome page render', async ({ page }) => {
  await expectWidgetAndWelcome(page, '/t/welcome')
  await expect(page.getByText('Profesor').first()).toBeVisible()
})

test('[teacher] welcome page shows teacher-specific milestones', async ({ page }) => {
  await page.goto('/t/welcome')
  const items = page.locator('[data-testid^="milestone-item-teacher."]')
  expect(await items.count()).toBeGreaterThan(0)
})

// ─── student ───
test('[student] sidebar widget + welcome page render', async ({ page }) => {
  await expectWidgetAndWelcome(page, '/s/welcome')
  await expect(page.getByText('Estudiante').first()).toBeVisible()
})

test('[student] dismiss + restore a student milestone', async ({ page }) => {
  await page.goto('/s/welcome')
  const code = 'student.profile_complete'
  const item = page.getByTestId(`milestone-item-${code}`)
  if (await item.count() === 0) {
    test.skip(true, 'milestone not present')
    return
  }
  const completed = await item.getAttribute('data-completed')
  if (completed === 'true') {
    test.skip(true, 'milestone already completed')
    return
  }
  await page.getByTestId(`milestone-dismiss-${code}`).click()
  await expect(item).toHaveAttribute('data-dismissed', 'true', { timeout: 10_000 })
  await page.getByTestId(`milestone-restore-${code}`).click()
  await expect(item).toHaveAttribute('data-dismissed', 'false', { timeout: 10_000 })
})

test('[student] cannot access /a/welcome (gets redirected)', async ({ page }) => {
  await page.goto('/a/welcome')
  await page.waitForURL((url) => !url.pathname.startsWith('/a'), { timeout: 10_000 })
  expect(page.url()).toContain('/s')
})

test('[teacher] cannot access /a/welcome (gets redirected)', async ({ page }) => {
  await page.goto('/a/welcome')
  await page.waitForURL((url) => !url.pathname.startsWith('/a'), { timeout: 10_000 })
  expect(page.url()).toContain('/t')
})
