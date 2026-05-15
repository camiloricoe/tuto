import { test as setup, expect } from '@playwright/test'
import path from 'node:path'

const authFile = path.join(__dirname, '.auth/admin.json')

const EMAIL = process.env.E2E_EMAIL ?? 'me@camilorico.com'
const PASSWORD = process.env.E2E_PASSWORD ?? 'TutoAdmin2026!'

setup('authenticate as super admin', async ({ page }) => {
  await page.goto('/login')

  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: /ingresar/i }).click()

  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 })

  await expect(page.getByText(/super admin/i).first()).toBeVisible({ timeout: 10_000 })

  await page.context().storageState({ path: authFile })
})
