import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.TEST_URL ?? 'http://localhost:3000'
const isRemote = baseURL.startsWith('http') && !baseURL.includes('localhost')

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'playwright-report/results.json' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'super-admin',
      testMatch: /\/(smoke|admin-chained|feedback|tenant-isolation|audit-verification|crud-validation|integrations|chaos|security|data-flow|edit-flows|subdomain-routing|tenant-cookie-isolation|branding-rendering|branding-update-flow|cross-tenant-login-block)\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], storageState: 'tests/e2e/.auth/super-admin.json' },
      dependencies: ['setup'],
    },
    {
      name: 'admin',
      testMatch: /\/(per-role|permissions|role-data-flow|subdomain-routing|tenant-cookie-isolation|branding-rendering|branding-update-flow|cross-tenant-login-block)\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], storageState: 'tests/e2e/.auth/admin.json' },
      dependencies: ['setup'],
      grep: /\[admin\]/,
    },
    {
      name: 'coordinator',
      testMatch: /\/(per-role|permissions|role-data-flow|subdomain-routing|tenant-cookie-isolation|branding-rendering|branding-update-flow|cross-tenant-login-block)\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], storageState: 'tests/e2e/.auth/coordinator.json' },
      dependencies: ['setup'],
      grep: /\[coordinator\]/,
    },
    {
      name: 'treasurer',
      testMatch: /\/(per-role|payments-chained|permissions|subdomain-routing|tenant-cookie-isolation|branding-rendering|branding-update-flow|cross-tenant-login-block)\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], storageState: 'tests/e2e/.auth/treasurer.json' },
      dependencies: ['setup'],
      grep: /\[treasurer\]/,
    },
    {
      name: 'teacher',
      testMatch: /\/(per-role|permissions|role-data-flow|subdomain-routing|tenant-cookie-isolation|branding-rendering|branding-update-flow|cross-tenant-login-block)\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], storageState: 'tests/e2e/.auth/teacher.json' },
      dependencies: ['setup'],
      grep: /\[teacher\]/,
    },
    {
      name: 'student',
      testMatch: /\/(per-role|permissions|role-data-flow|subdomain-routing|tenant-cookie-isolation|branding-rendering|branding-update-flow|cross-tenant-login-block)\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], storageState: 'tests/e2e/.auth/student.json' },
      dependencies: ['setup'],
      grep: /\[student\]/,
    },
  ],
  ...(isRemote
    ? {}
    : {
        webServer: {
          command: 'pnpm dev',
          url: 'http://localhost:3000',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }),
})
