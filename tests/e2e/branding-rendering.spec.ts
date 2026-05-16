import { test, expect, type Request } from '@playwright/test'

// Verifies that tenant branding is injected SERVER-SIDE (CSS variables in the
// initial HTML), not fetched client-side after hydration. This matters because
// a client fetch flashes unstyled content and exposes branding endpoints to
// untrusted origins.

const TENANT_HOST =
  process.env.TENANT_HOST ?? 'https://indecap.creadigitalagency.com'

test.describe('Branding rendering (server-side CSS vars)', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('initial HTML contains tenant CSS variables', async ({ request }) => {
    const res = await request.get(`${TENANT_HOST}/login`)
    expect(res.status()).toBe(200)
    const html = await res.text()

    // brand-provider.tsx emits a <style> tag with either `--brand-primary`
    // and/or `--primary`. At least one must be present in the SSR'd HTML.
    const hasBrandVar =
      /--brand-primary\s*:/.test(html) || /--primary\s*:/.test(html)
    expect(hasBrandVar, 'expected --brand-primary or --primary CSS var in SSR HTML').toBe(true)
  })

  test('if a logo_url is configured, the <img> tag is in the SSR HTML', async ({
    request,
  }) => {
    const res = await request.get(`${TENANT_HOST}/login`)
    const html = await res.text()

    // Heuristic: brand-logo.tsx renders an <img> with the supabase storage
    // URL. We don't FAIL if the tenant has no logo — we just verify that if
    // one is present, it's in the initial HTML (not client-fetched).
    const logoMatch = html.match(/<img[^>]+src="([^"]+)"[^>]*alt="[^"]*INDECAP[^"]*"/i)
    if (!logoMatch) {
      test.info().annotations.push({
        type: 'note',
        description: 'INDECAP has no logo_url set or alt does not include the name; skipping logo assertion.',
      })
      return
    }
    expect(logoMatch[1]).toMatch(/^https?:\/\//)
    expect(logoMatch[1]).toMatch(/supabase\.co|supabase\.in|storage/i)
  })

  test('no client-side XHR fetches branding data during page load', async ({
    page,
  }) => {
    const brandingRequests: string[] = []
    page.on('request', (req: Request) => {
      const url = req.url()
      const type = req.resourceType()
      // We watch for branding-shaped fetches: any xhr/fetch hitting an
      // endpoint with 'branding' in its path, or a supabase REST call for
      // tenant_branding rows.
      if (
        (type === 'xhr' || type === 'fetch') &&
        (/branding/i.test(url) || /tenant_branding/i.test(url))
      ) {
        brandingRequests.push(url)
      }
    })

    await page.goto(`${TENANT_HOST}/login`, { waitUntil: 'domcontentloaded' })
    // Give the network a moment to drain after DOMContentLoaded.
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

    expect(
      brandingRequests,
      `branding must be SSR-only; saw client fetches: ${brandingRequests.join(', ')}`,
    ).toHaveLength(0)
  })
})
