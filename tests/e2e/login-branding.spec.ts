import { test, expect } from '@playwright/test'

// These tests verify that the login page renders the right branding per host.
// They DO NOT attempt actual sign-in (would require per-tenant credentials).
//
// Hosts:
//   - https://indecap.creadigitalagency.com/login  -> tenant-aware (INDECAP)
//   - https://creadigitalagency.com/login          -> apex/generic (TUTO)
//
// Override hosts in CI/dev via env:
//   TENANT_LOGIN_URL  (default: https://indecap.creadigitalagency.com/login)
//   APEX_LOGIN_URL    (default: https://creadigitalagency.com/login)

const TENANT_LOGIN_URL =
  process.env.TENANT_LOGIN_URL ?? 'https://indecap.creadigitalagency.com/login'
const APEX_LOGIN_URL =
  process.env.APEX_LOGIN_URL ?? 'https://creadigitalagency.com/login'

test.describe('Login branding (tenant-aware)', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('INDECAP subdomain shows tenant branding', async ({ page }) => {
    await page.goto(TENANT_LOGIN_URL, { waitUntil: 'domcontentloaded' })

    // Headline area should mention the tenant name (INDECAP).
    // Either the heading "Iniciar sesion en INDECAP" or the standalone word
    // appears somewhere in the card header.
    await expect(page.getByText(/INDECAP/i).first()).toBeVisible({ timeout: 15_000 })

    // Form: email + password inputs present
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /ingresar/i })).toBeVisible()

    // Hidden tenantId field carrying the tenant context to the server action.
    await expect(page.locator('input[name="tenantId"]')).toHaveCount(1)
  })

  test('Apex domain shows generic TUTO branding (no tenant context)', async ({ page }) => {
    await page.goto(APEX_LOGIN_URL, { waitUntil: 'domcontentloaded' })

    // Apex must show "TUTO" branding fallback.
    await expect(page.getByText(/TUTO/).first()).toBeVisible({ timeout: 15_000 })

    // Form is still rendered, just without tenant context.
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()

    // No hidden tenantId field on apex.
    await expect(page.locator('input[name="tenantId"]')).toHaveCount(0)
  })
})
