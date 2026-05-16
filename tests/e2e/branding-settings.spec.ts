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

test.describe('Branding settings page', () => {
  test('renders form with current values', async ({ page }) => {
    await page.goto('/a/settings/branding')
    await expect(
      page.getByRole('heading', { name: 'Branding', level: 1 }),
    ).toBeVisible({ timeout: 15_000 })

    // Core form fields visible
    await expect(page.getByLabel('Color primario (HSL)')).toBeVisible()
    await expect(page.getByLabel('Color de acento (HSL)')).toBeVisible()
    await expect(page.getByLabel('Mensaje en login')).toBeVisible()
    await expect(page.getByLabel('Nombre del remitente')).toBeVisible()
    await expect(page.getByLabel('Email de respuesta')).toBeVisible()
    await expect(page.getByLabel('URL de soporte')).toBeVisible()
    await expect(page.getByLabel('Email de soporte')).toBeVisible()

    // Preview panel
    await expect(
      page.getByRole('heading', { name: 'Vista previa' }),
    ).toBeVisible()
  })

  test('file inputs accept the right MIME types', async ({ page }) => {
    await page.goto('/a/settings/branding')

    const logoInput = page.locator('input#logo')
    await expect(logoInput).toBeAttached()
    await expect(logoInput).toHaveAttribute('type', 'file')
    const logoAccept = await logoInput.getAttribute('accept')
    expect(logoAccept).toContain('image/png')
    expect(logoAccept).toContain('image/svg+xml')

    const faviconInput = page.locator('input#favicon')
    await expect(faviconInput).toBeAttached()
    await expect(faviconInput).toHaveAttribute('type', 'file')
    const faviconAccept = await faviconInput.getAttribute('accept')
    expect(faviconAccept).toContain('image/png')
    expect(
      faviconAccept?.includes('image/x-icon') ||
        faviconAccept?.includes('image/vnd.microsoft.icon'),
    ).toBeTruthy()
  })

  test('save invalid HSL surfaces error toast', async ({ page }) => {
    await page.goto('/a/settings/branding')
    const primary = page.getByLabel('Color primario (HSL)')
    await primary.fill('not-a-valid-hsl')
    await page.getByRole('button', { name: /guardar cambios/i }).click()
    await expect(page.getByText(/HSL primario invalido/i)).toBeVisible({
      timeout: 5_000,
    })
  })

  test('update primary HSL persists across reload', async ({ page }) => {
    // Use a deterministic-but-unique-enough hue so reruns don't collide.
    const hue = 100 + (parseInt(SUFFIX.slice(-2), 36) % 200)
    const newHsl = `${hue} 75% 50%`

    await page.goto('/a/settings/branding')
    const primary = page.getByLabel('Color primario (HSL)')
    await primary.fill(newHsl)
    await page.getByRole('button', { name: /guardar cambios/i }).click()
    await expect(page.getByText(/branding actualizado/i)).toBeVisible({
      timeout: 10_000,
    })

    await page.reload()
    await expect(page.getByLabel('Color primario (HSL)')).toHaveValue(newHsl, {
      timeout: 10_000,
    })
  })

  test('settings page links to branding', async ({ page }) => {
    await page.goto('/a/settings')
    const link = page.getByRole('link', { name: /branding y marca/i })
    await expect(link).toBeVisible()
    await link.click()
    await expect(
      page.getByRole('heading', { name: 'Branding', level: 1 }),
    ).toBeVisible({ timeout: 10_000 })
  })
})
