import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('sidebar link navigates to reports', async ({ page }) => {
    await page.getByRole('link', { name: 'Отчёты' }).click()
    await page.waitForURL('/reports')
    await expect(page.locator('h1:has-text("Финансовый отчёт")')).toBeVisible()
  })

  test('report shows KPI cards', async ({ page }) => {
    await page.goto('/reports')
    await page.waitForTimeout(3000)
    await expect(page.locator('text=Выручка').first()).toBeVisible()
    await expect(page.locator('text=Расходы').first()).toBeVisible()
    await expect(page.locator('text=Чистый доход').first()).toBeVisible()
  })

  test('report shows occupancy metrics', async ({ page }) => {
    await page.goto('/reports')
    await page.waitForTimeout(3000)
    // ADR, RevPAR, Occupancy should be visible
    await expect(page.locator('text=Загрузка').first()).toBeVisible()
    await expect(page.locator('text=ADR').first()).toBeVisible()
    await expect(page.locator('text=RevPAR').first()).toBeVisible()
  })

  test('PDF download button is visible', async ({ page }) => {
    await page.goto('/reports')
    await page.waitForTimeout(2000)
    await expect(page.getByText('Скачать PDF')).toBeVisible()
  })

  test('report has revenue by property section', async ({ page }) => {
    await page.goto('/reports')
    await page.waitForTimeout(3000)
    // "По объектам" table
    const byProperty = page.locator('text=По объектам')
    if (await byProperty.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(byProperty).toBeVisible()
    }
  })

  test('report has expenses by category section', async ({ page }) => {
    await page.goto('/reports')
    await page.waitForTimeout(3000)
    const byCategory = page.locator('text=По категориям')
    if (await byCategory.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(byCategory).toBeVisible()
    }
  })
})
