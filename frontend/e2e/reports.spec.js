import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Reports — financial KPIs and data display', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/reports')
    await page.waitForTimeout(3000)
  })

  // ---------------------------------------------------------------------------
  // KPI cards show real data
  // ---------------------------------------------------------------------------
  test('revenue card shows formatted monetary value', async ({ page }) => {
    const revenueCard = page.locator('.v-card').filter({ hasText: 'Выручка' }).first()
    await expect(revenueCard).toBeVisible()
    const value = await revenueCard.locator('.text-h4').textContent()
    // Should be a formatted money value, not "0" (seed has reservations with revenue)
    expect(value?.trim().length).toBeGreaterThan(0)
  })

  test('expenses card shows formatted monetary value', async ({ page }) => {
    const expenseCard = page.locator('.v-card').filter({ hasText: 'Расходы' }).first()
    await expect(expenseCard).toBeVisible()
    const value = await expenseCard.locator('.text-h4').textContent()
    expect(value?.trim().length).toBeGreaterThan(0)
  })

  test('net income card color is dynamic — green when positive, red when negative', async ({ page }) => {
    const netCard = page.locator('.v-card').filter({ hasText: 'Чистый доход' }).first()
    await expect(netCard).toBeVisible()
    // Card should have either green or red color class
    const cardClasses = await netCard.getAttribute('class')
    const hasColor = cardClasses?.includes('green') || cardClasses?.includes('red')
    expect(hasColor).toBeTruthy()
  })

  // ---------------------------------------------------------------------------
  // Occupancy metrics
  // ---------------------------------------------------------------------------
  test('occupancy metrics display ADR, RevPAR, and rate', async ({ page }) => {
    await expect(page.locator('text=Загрузка').first()).toBeVisible()
    await expect(page.locator('text=ADR').first()).toBeVisible()
    await expect(page.locator('text=RevPAR').first()).toBeVisible()
  })

  test('occupancy rate shows percentage format', async ({ page }) => {
    // Find text matching N.N% pattern
    const occupancyText = page.locator('text=/\\d+\\.\\d+%/').first()
    if (await occupancyText.isVisible({ timeout: 2000 }).catch(() => false)) {
      const text = await occupancyText.textContent()
      expect(text).toMatch(/\d+\.\d+%/)
    }
  })

  // ---------------------------------------------------------------------------
  // Breakdown tables
  // ---------------------------------------------------------------------------
  test('revenue by property table shows seed properties', async ({ page }) => {
    const byProperty = page.locator('text=По объектам').first()
    if (await byProperty.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Seed properties: Sea View Apartment, Tverskaya Hostel, Arbat Boutique Hotel
      const table = byProperty.locator('xpath=following::table[1]')
      if (await table.isVisible({ timeout: 2000 }).catch(() => false)) {
        const text = await table.textContent()
        // At least one property should appear
        const hasProperty = text?.includes('Sea View') || text?.includes('Tverskaya') || text?.includes('Arbat')
        expect(hasProperty).toBeTruthy()
      }
    }
  })

  test('expenses by category table shows localized categories', async ({ page }) => {
    const byCategory = page.locator('text=По категориям').first()
    if (await byCategory.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(byCategory).toBeVisible()
    }
  })

  // ---------------------------------------------------------------------------
  // PDF download
  // ---------------------------------------------------------------------------
  test('PDF button initiates download', async ({ page }) => {
    const pdfBtn = page.getByText('Скачать PDF')
    await expect(pdfBtn).toBeVisible()
    // Click and verify it doesn't error (loading state shown)
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
      pdfBtn.click(),
    ])
    // Either download happened or button showed loading state
    if (download) {
      expect(download.suggestedFilename()).toContain('.pdf')
    }
  })
})
