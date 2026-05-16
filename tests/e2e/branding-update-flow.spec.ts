import { test, expect } from '@playwright/test'

// End-to-end round-trip for the branding update flow:
//   1. Read current primary_hsl
//   2. Change it to a deterministic value
//   3. Save and assert success toast
//   4. Reload and verify the new value persisted
//   5. Restore the original value (cleanup)
//
// Uses the default project storageState (super-admin) so we stay logged in
// and pin the active tenant to INDECAP via the `tuto-active-tenant` cookie.

const INDECAP_ID = '0dfeb630-870c-4bf2-8463-fbcefd9d1ab7'
const NEW_HSL = '180 100% 40%' // teal — distinct from any prior test value

test.describe.configure({ mode: 'serial' })

test.describe('Branding update full round-trip', () => {
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

  test('save → reload → persisted → restore', async ({ page }) => {
    await page.goto('/a/settings/branding')
    await expect(
      page.getByRole('heading', { name: 'Branding', level: 1 }),
    ).toBeVisible({ timeout: 15_000 })

    const primary = page.getByLabel('Color primario (HSL)')

    // 1. Capture original value for cleanup.
    const original = (await primary.inputValue()).trim()

    // Guard against accidentally clobbering with the same value.
    const target = original === NEW_HSL ? '200 100% 40%' : NEW_HSL

    try {
      // 2. Set new value and save.
      await primary.fill(target)
      await page.getByRole('button', { name: /guardar cambios/i }).click()
      await expect(page.getByText(/branding actualizado/i)).toBeVisible({
        timeout: 10_000,
      })

      // 3. Reload and verify persisted.
      await page.reload()
      await expect(page.getByLabel('Color primario (HSL)')).toHaveValue(target, {
        timeout: 10_000,
      })
    } finally {
      // 4. Cleanup — restore the original value, even if assertions failed.
      try {
        const cleanupPrimary = page.getByLabel('Color primario (HSL)')
        await cleanupPrimary.fill(original || '221 83% 53%')
        await page
          .getByRole('button', { name: /guardar cambios/i })
          .click({ timeout: 5_000 })
        await expect(page.getByText(/branding actualizado/i)).toBeVisible({
          timeout: 10_000,
        })
      } catch {
        // Cleanup is best-effort; don't mask the original assertion failure.
      }
    }
  })
})
