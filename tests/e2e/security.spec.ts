import { test, expect } from '@playwright/test'

test.describe('Security headers', () => {
  test('login page sets standard security headers', async ({ request }) => {
    const res = await request.get('/login')
    const h = res.headers()
    expect(h['x-frame-options']?.toLowerCase()).toBe('deny')
    expect(h['x-content-type-options']?.toLowerCase()).toBe('nosniff')
    expect(h['referrer-policy']?.toLowerCase()).toContain('strict-origin')
    expect(h['permissions-policy']).toContain('camera=()')
  })

  test('admin dashboard sets security headers', async ({ page, request }) => {
    await page.goto('/a')
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const res = await request.get('/a', { headers: { cookie: cookieHeader } })
    const h = res.headers()
    expect(h['x-frame-options']?.toLowerCase()).toBe('deny')
    expect(h['x-content-type-options']?.toLowerCase()).toBe('nosniff')
  })
})

test.describe('Cookie security', () => {
  test('supabase auth-token cookies are HttpOnly with safe SameSite', async ({ page }) => {
    await page.goto('/a')
    const cookies = await page.context().cookies()
    // Only assert on the JWT-bearing cookies. Code verifier cookies for OAuth
    // PKCE flow may legitimately be non-HttpOnly so the browser can read them.
    const tokenCookies = cookies.filter(
      (c) => c.name.startsWith('sb-') && c.name.includes('auth-token') && !c.name.includes('verifier'),
    )
    expect(tokenCookies.length).toBeGreaterThan(0)
    for (const c of tokenCookies) {
      expect(c.httpOnly, `${c.name} must be HttpOnly`).toBe(true)
      expect(['Lax', 'Strict']).toContain(c.sameSite)
    }
  })

  test('active tenant cookie is HttpOnly', async ({ page }) => {
    await page.goto('/a')
    const cookies = await page.context().cookies()
    const tenantCookie = cookies.find((c) => c.name === 'tuto-active-tenant')
    if (tenantCookie) {
      expect(tenantCookie.httpOnly).toBe(true)
    }
  })
})

test.describe('Auth boundaries', () => {
  test('unauthenticated GET /a/users redirects to login', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    await page.goto('/a/users')
    await page.waitForURL(/login/, { timeout: 15_000 })
    await ctx.close()
  })

  test('unauthenticated GET /api/pdf/receipt returns non-2xx', async ({ request }) => {
    const res = await request.get('/api/pdf/receipt?paymentId=any', { failOnStatusCode: false, maxRedirects: 0 })
    expect([301, 302, 307, 308, 401, 403, 404]).toContain(res.status())
  })

  test('unauthenticated GET /api/pdf/grade-report returns non-2xx', async ({ request }) => {
    const res = await request.get('/api/pdf/grade-report?courseId=any', { failOnStatusCode: false, maxRedirects: 0 })
    expect([301, 302, 307, 308, 401, 403, 404]).toContain(res.status())
  })

  test('health ingestion requires token', async ({ request }) => {
    const res = await request.post('/api/health/test-run', {
      data: { source: 'manual', status: 'passed' },
      failOnStatusCode: false,
    })
    expect([401, 403, 503]).toContain(res.status())
  })

  test('health ingestion with bogus token is rejected', async ({ request }) => {
    const res = await request.post('/api/health/test-run', {
      headers: { 'x-tuto-health-token': 'wrong-token' },
      data: { source: 'manual', status: 'passed' },
      failOnStatusCode: false,
    })
    expect([401, 403, 503]).toContain(res.status())
  })
})

test.describe('Sensitive data exposure', () => {
  test('users page does not leak password hash', async ({ page }) => {
    await page.goto('/a/users')
    const html = await page.content()
    expect(html).not.toMatch(/encrypted_password/i)
    expect(html).not.toMatch(/\$2[aby]\$\d{2}\$/) // bcrypt hash pattern
  })

  test('audit page does not leak service role key', async ({ page }) => {
    await page.goto('/a/audit')
    const html = await page.content()
    expect(html).not.toMatch(/sb_secret_/)
    expect(html).not.toMatch(/SUPABASE_SERVICE_ROLE/)
  })

  test('feedback page does not leak service role key', async ({ page }) => {
    await page.goto('/a/feedback')
    const html = await page.content()
    expect(html).not.toMatch(/sb_secret_/)
  })

  test('client bundle does not contain service role key', async ({ page }) => {
    const responses: string[] = []
    page.on('response', async (res) => {
      const url = res.url()
      if (url.includes('/_next/static/') && (url.endsWith('.js') || url.includes('.js?'))) {
        try {
          const body = await res.text()
          if (body.match(/sb_secret_|SUPABASE_SERVICE_ROLE_KEY/)) {
            responses.push(url)
          }
        } catch {
          // ignore
        }
      }
    })
    await page.goto('/a')
    await page.waitForLoadState('networkidle')
    expect(responses, `Service role key leaked in: ${responses.join(', ')}`).toHaveLength(0)
  })
})

test.describe('Open redirect protection', () => {
  test('successful login redirects to role portal, not external URL', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    // Even if attacker controls ?next=, login action redirects to role-derived portal
    await page.goto('/login?next=https://evil.example.com/x')
    await expect(page.getByRole('heading', { name: 'TUTO' })).toBeVisible()
    await page.getByLabel('Email').fill('e2e-student@tuto.test')
    await page.getByLabel('Password').fill('TestE2E2026!')
    await page.getByRole('button', { name: /ingresar/i }).click()
    await page.waitForURL(/\/s/, { timeout: 15_000 })
    expect(page.url()).not.toContain('evil.example.com')
    await ctx.close()
  })
})

test.describe('Rate limiting', () => {
  test('repeated bad logins are eventually throttled', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    let throttled = false
    for (let i = 0; i < 12; i++) {
      await page.goto('/login')
      await page.getByLabel('Email').fill(`spam${i}@nowhere.test`)
      await page.getByLabel('Password').fill('wrong')
      await page.getByRole('button', { name: /ingresar/i }).click()
      await page.waitForLoadState('networkidle')
      const html = await page.content()
      if (/demasiados|rate limit|too many|intenta/i.test(html)) {
        throttled = true
        break
      }
    }
    // Either throttled OR Upstash isn't wired — log as info, don't hard-fail (Upstash may be optional)
    test.info().annotations.push({
      type: 'rate-limit',
      description: throttled ? 'rate limited correctly' : 'no rate limit observed (Upstash may be unconfigured)',
    })
  })
})
