import { test as setup, expect, type Page } from '@playwright/test'
import path from 'node:path'

const ROLES = [
  { key: 'super-admin', email: process.env.E2E_EMAIL ?? 'me@camilorico.com', password: process.env.E2E_PASSWORD ?? 'TutoAdmin2026!', expectedPortal: '/a' },
  { key: 'admin',       email: 'e2e-admin@tuto.test',       password: 'TestE2E2026!', expectedPortal: '/a' },
  { key: 'coordinator', email: 'e2e-coordinator@tuto.test', password: 'TestE2E2026!', expectedPortal: '/a' },
  { key: 'treasurer',   email: 'e2e-treasurer@tuto.test',   password: 'TestE2E2026!', expectedPortal: '/a' },
  { key: 'teacher',     email: 'e2e-teacher@tuto.test',     password: 'TestE2E2026!', expectedPortal: '/t' },
  { key: 'student',     email: 'e2e-student@tuto.test',     password: 'TestE2E2026!', expectedPortal: '/s' },
] as const

async function loginAndSave(page: Page, email: string, password: string, expectedPortal: string, file: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /ingresar/i }).click()
  await page.waitForURL((url) => url.pathname.startsWith(expectedPortal), { timeout: 15_000 })
  await expect(page.locator('body')).toBeVisible()
  await page.context().storageState({ path: file })
}

for (const role of ROLES) {
  setup(`authenticate ${role.key}`, async ({ page }) => {
    await loginAndSave(
      page,
      role.email,
      role.password,
      role.expectedPortal,
      path.join(__dirname, `.auth/${role.key}.json`),
    )
  })
}
