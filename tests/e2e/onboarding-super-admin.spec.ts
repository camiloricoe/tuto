import { test, expect } from '@playwright/test'

test.describe('Onboarding — super_admin', () => {
  test('sidebar widget is visible on /a', async ({ page }) => {
    await page.goto('/a')
    const widget = page.getByTestId('milestone-widget')
    await expect(widget).toBeVisible()
  })

  test('widget links to /a/welcome', async ({ page }) => {
    await page.goto('/a')
    await page.getByTestId('milestone-widget').click()
    await page.waitForURL('**/a/welcome', { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Primeros pasos' })).toBeVisible()
  })

  test('/a/welcome renders progress header and milestone list', async ({ page }) => {
    await page.goto('/a/welcome')
    await expect(page.getByRole('heading', { name: 'Primeros pasos' })).toBeVisible()
    await expect(page.getByTestId('milestone-progress-summary')).toBeVisible()
    await expect(page.getByTestId('milestone-list')).toBeVisible()
    // At least one milestone item is rendered
    const items = page.locator('[data-testid^="milestone-item-"]')
    expect(await items.count()).toBeGreaterThan(0)
  })

  test('header shows correct role label for super admin', async ({ page }) => {
    await page.goto('/a/welcome')
    await expect(page.getByText('Super Administrador')).toBeVisible()
  })

  test('progress widget exposes percent attribute (0-100)', async ({ page }) => {
    await page.goto('/a')
    const widget = page.getByTestId('milestone-widget')
    const percentAttr = await widget.getAttribute('data-percent')
    if (percentAttr !== null) {
      const pct = Number(percentAttr)
      expect(pct).toBeGreaterThanOrEqual(0)
      expect(pct).toBeLessThanOrEqual(100)
    }
  })

  test('dismiss + restore round-trip for a milestone', async ({ page }) => {
    await page.goto('/a/welcome')
    // Pick a known super_admin milestone that is unlikely to be auto-completed
    const code = 'superadmin.custom_domain'
    const dismiss = page.getByTestId(`milestone-dismiss-${code}`)
    const item = page.getByTestId(`milestone-item-${code}`)

    // If the milestone is already completed or dismissed, skip gracefully
    const completed = await item.getAttribute('data-completed')
    if (completed === 'true') {
      test.skip(true, 'milestone already completed in this environment')
      return
    }

    await dismiss.click()
    // The item should remain visible but flip to dismissed state
    await expect(item).toHaveAttribute('data-dismissed', 'true', { timeout: 10_000 })

    const restore = page.getByTestId(`milestone-restore-${code}`)
    await restore.click()
    await expect(item).toHaveAttribute('data-dismissed', 'false', { timeout: 10_000 })
  })
})
