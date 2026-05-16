import { test, expect } from '@playwright/test'

// Verifies hostname-based routing on the production deployment.
// Hits real subdomains directly with absolute URLs, bypassing the project
// baseURL so we exercise the wildcard DNS + middleware path.
//
// Hosts (overridable via env):
//   TENANT_HOST          (default: https://indecap.creadigitalagency.com)
//   APEX_HOST            (default: https://creadigitalagency.com)
//   APP_HOST             (default: https://tuto-flame.vercel.app) — generic TUTO
//   UNKNOWN_HOST         (default: https://nonexistent-xyz123.creadigitalagency.com)

const TENANT_HOST = process.env.TENANT_HOST ?? 'https://indecap.creadigitalagency.com'
const APEX_HOST = process.env.APEX_HOST ?? 'https://creadigitalagency.com'
const APP_HOST = process.env.APP_HOST ?? 'https://tuto-flame.vercel.app'
const UNKNOWN_HOST =
  process.env.UNKNOWN_HOST ?? 'https://nonexistent-xyz123.creadigitalagency.com'

test.describe('Subdomain routing', () => {
  // No saved auth — exercise the unauthenticated middleware path.
  test.use({ storageState: { cookies: [], origins: [] } })

  test('GET / on tenant subdomain redirects unauthenticated user to /login', async ({
    request,
  }) => {
    const res = await request.get(`${TENANT_HOST}/`, { maxRedirects: 0 })
    // Either a redirect status with /login in the Location header, OR a 200
    // page that contains the login UI (Next.js redirect can vary by edge).
    if (res.status() >= 300 && res.status() < 400) {
      const location = res.headers()['location'] ?? ''
      expect(location).toMatch(/\/login/i)
    } else {
      expect(res.status()).toBe(200)
      const body = await res.text()
      expect(body.toLowerCase()).toMatch(/login|ingresar|iniciar sesion/i)
    }
  })

  test('GET /login on tenant subdomain returns 200 and contains "INDECAP"', async ({
    request,
  }) => {
    const res = await request.get(`${TENANT_HOST}/login`)
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).toMatch(/INDECAP/i)
  })

  test('GET /api/pdf/receipt with invalid id is non-2xx (auth/tenant guard)', async ({
    request,
  }) => {
    const res = await request.get(
      `${TENANT_HOST}/api/pdf/receipt?paymentId=invalid`,
      { maxRedirects: 0 },
    )
    // Acceptable: 3xx redirect to login, 401/403 unauthorised, 404 not found,
    // or 4xx validation error. The only failure is a successful 2xx that
    // bypasses auth / tenant scoping.
    expect(res.status()).toBeGreaterThanOrEqual(300)
    expect(res.status()).toBeLessThan(600)
    expect(res.ok()).toBe(false)
  })

  test('App host /login shows generic TUTO branding (no tenant context)', async ({
    request,
  }) => {
    // The apex `creadigitalagency.com` currently serves a static marketing
    // site, so we hit the canonical TUTO app deployment to verify generic
    // (untenanted) branding. APEX_HOST is checked separately for status only.
    const res = await request.get(`${APP_HOST}/login`)
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).toMatch(/TUTO/)
    // Should NOT carry a hidden tenantId hint specific to a single tenant.
    expect(body).not.toMatch(/name="tenantId"\s+value="0dfeb630-870c-4bf2-8463-fbcefd9d1ab7"/)
  })

  test('Apex domain is reachable (sanity)', async ({ request }) => {
    const res = await request.get(`${APEX_HOST}/`, { maxRedirects: 0 })
    // Apex may be a static marketing page (200) or redirect to www (3xx).
    expect(res.status()).toBeGreaterThanOrEqual(200)
    expect(res.status()).toBeLessThan(500)
  })

  test('Unknown subdomain serves not-found-subdomain page or redirects to it', async ({
    request,
    page,
  }) => {
    // First check raw response — middleware redirects unknown subdomains to
    // /not-found-subdomain.
    const res = await request.get(`${UNKNOWN_HOST}/`, { maxRedirects: 0 })
    if (res.status() >= 300 && res.status() < 400) {
      const location = res.headers()['location'] ?? ''
      expect(location).toMatch(/not-found-subdomain/i)
    } else {
      // Some edges follow the redirect server-side and return the final page.
      expect(res.status()).toBeLessThan(500)
    }

    // And follow it through the browser to make sure the page itself renders.
    await page.goto(`${UNKNOWN_HOST}/`, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/not-found-subdomain/i, { timeout: 15_000 })
  })

  test('Tenant subdomain responses carry standard security headers', async ({
    request,
  }) => {
    const res = await request.get(`${TENANT_HOST}/login`)
    expect(res.status()).toBe(200)
    const headers = res.headers()
    expect(headers['x-frame-options']?.toLowerCase()).toBe('deny')
    expect(headers['x-content-type-options']?.toLowerCase()).toBe('nosniff')
    expect(headers['referrer-policy']).toMatch(/strict-origin-when-cross-origin/i)
  })
})
