import { test, expect } from '@playwright/test'

// Proves that the URL (hostname) is the authoritative source of the active
// tenant. The middleware MUST overwrite any `tuto-active-tenant` cookie value
// that disagrees with the hostname's resolved tenant.

const TENANT_HOST =
  process.env.TENANT_HOST ?? 'https://indecap.creadigitalagency.com'
const INDECAP_ID = '0dfeb630-870c-4bf2-8463-fbcefd9d1ab7'
const FAKE_TENANT_ID = '11111111-1111-1111-1111-111111111111'
const TENANT_COOKIE = 'tuto-active-tenant'

test.describe('Tenant cookie isolation (hostname authoritative)', () => {
  // Run without saved auth — public /login is sufficient to trigger the
  // hostname → tenant middleware path.
  test.use({ storageState: { cookies: [], origins: [] } })

  test('middleware overwrites a forged tenant cookie with the host-resolved id', async ({
    context,
    page,
  }) => {
    const url = new URL(TENANT_HOST)

    // Plant a forged cookie BEFORE any navigation.
    await context.addCookies([
      {
        name: TENANT_COOKIE,
        value: FAKE_TENANT_ID,
        domain: url.hostname,
        path: '/',
        httpOnly: false,
        secure: url.protocol === 'https:',
        sameSite: 'Lax',
      },
    ])

    // Sanity: forged cookie is set.
    const before = await context.cookies(TENANT_HOST)
    const forged = before.find((c) => c.name === TENANT_COOKIE)
    expect(forged?.value).toBe(FAKE_TENANT_ID)

    // Navigate to any page on the tenant subdomain — middleware must run.
    const resp = await page.goto(`${TENANT_HOST}/login`, {
      waitUntil: 'domcontentloaded',
    })
    expect(resp?.status()).toBe(200)

    // After the response, the cookie must reflect the REAL INDECAP id.
    const after = await context.cookies(TENANT_HOST)
    const resolved = after.find((c) => c.name === TENANT_COOKIE)
    expect(resolved, 'tuto-active-tenant cookie should be set by middleware').toBeDefined()
    expect(resolved!.value).toBe(INDECAP_ID)
    expect(resolved!.value).not.toBe(FAKE_TENANT_ID)
  })

  test('cookie is set on tenant subdomain even with no pre-existing cookie', async ({
    context,
    page,
  }) => {
    // Start fully clean (storageState is empty per test.use above, but make sure).
    await context.clearCookies()

    const resp = await page.goto(`${TENANT_HOST}/login`, {
      waitUntil: 'domcontentloaded',
    })
    expect(resp?.status()).toBe(200)

    const cookies = await context.cookies(TENANT_HOST)
    const tenant = cookies.find((c) => c.name === TENANT_COOKIE)
    expect(tenant, 'middleware must seed the tenant cookie on subdomain hosts').toBeDefined()
    expect(tenant!.value).toBe(INDECAP_ID)
  })
})
