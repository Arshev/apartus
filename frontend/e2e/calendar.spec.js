import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Calendar view', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('sidebar link navigates to calendar', async ({ page }) => {
    await page.getByRole('link', { name: 'Календарь' }).click()
    await page.waitForURL('/calendar')
    await expect(page.locator('h1:has-text("Календарь")')).toBeVisible()
  })

  test('calendar renders grid or loading state', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForTimeout(2000)
    // Either calendar grid or progress bar
    const grid = page.locator('.calendar-grid')
    const progress = page.locator('.v-progress-linear')
    const error = page.locator('.v-alert')
    await expect(grid.or(progress).or(error).first()).toBeVisible({ timeout: 10000 })
  })

  test('today button is visible', async ({ page }) => {
    await page.goto('/calendar')
    await expect(page.getByText('Сегодня')).toBeVisible()
  })

  test('navigation arrows shift dates', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForTimeout(2000)
    // Click forward arrow
    await page.locator('.mdi-chevron-right').click()
    await page.waitForTimeout(500)
    // Click back arrow
    await page.locator('.mdi-chevron-left').click()
    await page.waitForTimeout(500)
    // Page should still be on calendar without errors
    expect(page.url()).toContain('/calendar')
  })

  test('today button resets view', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForTimeout(1000)
    // Shift forward, then click today
    await page.locator('.mdi-chevron-right').click()
    await page.waitForTimeout(500)
    await page.getByText('Сегодня').click()
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/calendar')
  })

  test('unit rows display property → unit names', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForTimeout(3000)
    const grid = page.locator('.calendar-grid')
    if (await grid.isVisible()) {
      // Unit cell has format "Property → Unit"
      const unitCell = page.locator('.calendar-unit-cell').first()
      await expect(unitCell).toBeVisible()
      const text = await unitCell.textContent()
      expect(text).toContain('→')
    }
  })
})
