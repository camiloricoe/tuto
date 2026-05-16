import { test, expect } from '@playwright/test'

// Verifies that attempting to log into a tenant subdomain with a user that
// belongs to a DIFFERENT tenant produces the friendly cross-tenant error and
// does NOT establish a session.
//
// Required env (per-tenant credentials):
//   CROSS_TENANT_TARGET_URL  default: https://e2e-iso.creadigitalagency.com/login
//   CROSS_TENANT_EMAIL       default: e2e-student@tuto.test (INDECAP user)
//   CROSS_TENANT_PASSWORD    default: TestE2E2026!
//   CROSS_TENANT_HOST_NAME   default: E2E Iso Tenant
//
// If the target host or credentials are not provisioned in the deployment
// environment, this spec self-skips with KNOWN-FLAKE-CREDENTIALS rather than
// failing. The author/runner is responsible for ensuring the iso tenant exists
// and the INDECAP student user is provisioned.

const TARGET_URL =
  process.env.CROSS_TENANT_TARGET_URL ??
  'https://e2e-iso.creadigitalagency.com/login'
const EMAIL = process.env.CROSS_TENANT_EMAIL ?? 'e2e-student@tuto.test'
const PASSWORD = process.env.CROSS_TENANT_PASSWORD ?? 'TestE2E2026!'
const HOST_NAME = process.env.CROSS_TENANT_HOST_NAME ?? 'E2E Iso Tenant'

test.describe('Cross-tenant login is rejected with friendly error', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('login with INDECAP user on iso tenant subdomain shows error', async ({
    page,
    request,
  }) => {
    // KNOWN-FLAKE-CREDENTIALS: requires a provisioned `e2e-iso` subdomain AND
    // an INDECAP-only test user. Skip cleanly if the target is unreachable so
    // CI doesn't bleed time on an environmental gap.
    let reachable = false
    try {
      const probe = await request.get(TARGET_URL, { maxRedirects: 0, timeout: 10_000 })
      reachable = probe.status() < 500
    } catch {
      reachable = false
    }
    test.skip(
      !reachable,
      `KNOWN-FLAKE-CREDENTIALS: ${TARGET_URL} not reachable in this environment`,
    )

    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' })

    // Fill the login form (mirrors auth.setup.ts patterns).
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: /ingresar/i }).click()

    // Expect a friendly error mentioning the host tenant name. The exact
    // wording is "Este correo no está registrado en <Tenant>" but we accept
    // any error that names the host tenant.
    const errorLocator = page
      .getByText(new RegExp(`(no est[aá] registrado|not registered|sin acceso).*${HOST_NAME}`, 'i'))
      .or(page.getByText(new RegExp(`${HOST_NAME}.*(no est[aá] registrado|not registered|sin acceso)`, 'i')))

    await expect(errorLocator.first()).toBeVisible({ timeout: 15_000 })

    // And critically: we must NOT have been redirected into the app shell.
    expect(page.url()).toMatch(/\/login/i)
  })
})
