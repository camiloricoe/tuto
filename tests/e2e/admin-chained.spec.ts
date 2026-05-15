import { test, expect } from '@playwright/test'

const SUFFIX = Date.now().toString(36).toUpperCase()
const PROGRAM_NAME = `E2E Programa ${SUFFIX}`
const PROGRAM_CODE = `E2E_PROG_${SUFFIX}`
const PERIOD_NAME = `E2E Periodo ${SUFFIX}`
const PERIOD_CODE = `E2E_PER_${SUFFIX}`
const SCHEME_NAME = `E2E Escala ${SUFFIX}`
const SUBJECT_NAME = `E2E Materia ${SUFFIX}`
const SUBJECT_CODE = `E2E_SUB_${SUFFIX}`

test.describe.configure({ mode: 'serial' })

test('chain: create program', async ({ page }) => {
  await page.goto('/a/academic/programs/new')
  await page.getByLabel('Nombre').fill(PROGRAM_NAME)
  await page.getByLabel('Codigo').fill(PROGRAM_CODE)
  await page.getByLabel('Modalidad').selectOption('fixed_curriculum')
  await page.getByLabel('Duracion (periodos)').fill('4')
  await page.getByRole('button', { name: /crear programa/i }).click()
  await expect(page.getByText(/programa creado exitosamente/i)).toBeVisible({ timeout: 10_000 })
})

test('chain: create academic period', async ({ page }) => {
  await page.goto('/a/settings')
  await page.locator('#period-name').fill(PERIOD_NAME)
  await page.locator('#period-code').fill(PERIOD_CODE)
  await page.locator('#period-kind').selectOption('semester')
  await page.locator('#period-starts').fill('2026-01-15')
  await page.locator('#period-ends').fill('2026-06-15')
  await page.getByRole('button', { name: /crear periodo/i }).click()
  await expect(page.getByText(/periodo creado correctamente/i)).toBeVisible({ timeout: 10_000 })
})

test('chain: create grading scheme', async ({ page }) => {
  await page.goto('/a/settings')
  await page.locator('#scheme-name').fill(SCHEME_NAME)
  await page.locator('#scheme-passing').fill('70')
  await page.getByRole('button', { name: /crear esquema/i }).click()
  await expect(page.getByText(/esquema creado correctamente/i)).toBeVisible({ timeout: 10_000 })
})

test('chain: create subject linked to program', async ({ page }) => {
  await page.goto('/a/settings')
  await page.locator('#subject-name').fill(SUBJECT_NAME)
  await page.locator('#subject-code').fill(SUBJECT_CODE)
  await page.locator('#subject-program').selectOption({ label: PROGRAM_NAME })
  await page.getByRole('button', { name: /crear materia/i }).click()
  await expect(page.getByText(/materia creada correctamente/i)).toBeVisible({ timeout: 10_000 })
})

test('chain: create course using subject + period + scheme', async ({ page }) => {
  await page.goto('/a/academic/courses/new')
  await page.locator('#subjectId').selectOption({ label: `${SUBJECT_NAME} (${SUBJECT_CODE})` })
  await page.locator('#periodId').selectOption({ label: `${PERIOD_NAME} (${PERIOD_CODE})` })
  await page.locator('#gradingSchemeId').selectOption({ label: SCHEME_NAME })
  await page.getByRole('button', { name: /crear curso/i }).click()

  // Action either shows success or redirects; both are valid
  await Promise.race([
    page.waitForURL(/\/a\/academic\/courses(?!\/new)/, { timeout: 15_000 }),
    page.getByText(/curso creado exitosamente/i).waitFor({ timeout: 15_000 }),
  ])
})

test('chain: course appears in list', async ({ page }) => {
  await page.goto('/a/academic/courses')
  await expect(page.getByText(SUBJECT_NAME)).toBeVisible({ timeout: 10_000 })
})
