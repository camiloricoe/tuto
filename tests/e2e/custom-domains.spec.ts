import { test, expect } from '@playwright/test'

// ─── Custom-domain admin page e2e ──────────────────────────────────────────
//
// Runs under the super-admin storage state (default project). The test:
//   1. Navigates to the tenants list.
//   2. Follows the per-row "Dominios" link to the first tenant's domains page.
//   3. Verifies the form renders (subdomain URL, DNS instructions, verify
//      button, save button).
//   4. Submits an invalid domain → expects an error toast.
//   5. Submits a valid (test) domain → expects either a success toast or, if
//      that domain is already in use by another tenant, a uniqueness error.

test.describe('Custom domains — super admin', () => {
  test('renders, validates, and saves a custom domain', async ({ page }) => {
    // 1) tenants list
    await page.goto('/a/tenants')
    await expect(page.getByRole('heading', { name: 'Instituciones' })).toBeVisible()

    // 2) follow the first "Dominios" link
    const domainsLink = page.getByRole('link', { name: /dominios/i }).first()
    await expect(domainsLink).toBeVisible({ timeout: 10_000 })
    await domainsLink.click()

    await page.waitForURL(/\/a\/tenants\/[^/]+\/domains$/, { timeout: 10_000 })

    // 3) form pieces render
    await expect(page.getByRole('heading', { name: /dominios —/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'URLs actuales' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Instrucciones DNS' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Verificar dominio' })).toBeVisible()

    await expect(page.getByLabel('Dominio personalizado')).toBeVisible()
    await expect(page.getByRole('button', { name: /guardar dominio/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /verificar dominio/i })).toBeVisible()

    // 4) invalid domain → error toast
    await page.getByLabel('Dominio personalizado').fill('not a domain!!')
    await page.getByRole('button', { name: /guardar dominio/i }).click()
    await expect(
      page
        .getByText(
          /(no incluyas|invalid|invalido|no debe|no se permiten|empezar|terminar|punto|guion|caracteres|completo)/i,
        )
        .first(),
    ).toBeVisible({ timeout: 10_000 })

    // 5) valid domain → success OR a "already in use" error (both are valid
    // outcomes depending on test-run history). Either way, no validation error.
    const unique = `e2e-${Date.now().toString(36)}.tuto-e2e.test`
    await page.getByLabel('Dominio personalizado').fill(unique)
    await page.getByRole('button', { name: /guardar dominio/i }).click()

    await expect(
      page.getByText(/(dominio asignado|ya esta en uso)/i).first(),
    ).toBeVisible({ timeout: 10_000 })
  })
})
