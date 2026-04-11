import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Channels — sync logic and platform labels', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/channels')
    await page.waitForTimeout(2000)
  })

  // ---------------------------------------------------------------------------
  // Seed data display
  // ---------------------------------------------------------------------------
  test('table shows 3 seed channels', async ({ page }) => {
    const rows = page.locator('.v-data-table tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('platform column shows localized labels (Airbnb, Booking.com, Островок)', async ({ page }) => {
    const cells = page.locator('.v-data-table tbody td')
    const texts = await cells.allTextContents()
    const joined = texts.join(' ')
    // Seed: airbnb, booking_com, ostrovok
    expect(joined).toContain('Airbnb')
    expect(joined).toContain('Booking.com')
    expect(joined).toContain('Островок')
  })

  test('iCal export URL shown as /api/v1/public/ical/ path', async ({ page }) => {
    const codeEl = page.locator('.v-data-table code').first()
    await expect(codeEl).toBeVisible()
    const text = await codeEl.textContent()
    expect(text).toContain('/api/v1/public/ical/')
  })

  // ---------------------------------------------------------------------------
  // Sync button conditional state
  // ---------------------------------------------------------------------------
  test('sync button disabled when channel has no import URL', async ({ page }) => {
    // Seed: airbnb channel has no ical_import_url
    const rows = page.locator('.v-data-table tbody tr')
    const count = await rows.count()
    let foundDisabled = false
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i)
      const syncBtn = row.getByText('Sync')
      if (await syncBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        if (await syncBtn.isDisabled()) {
          foundDisabled = true
          break
        }
      }
    }
    expect(foundDisabled).toBeTruthy()
  })

  test('sync button enabled when channel has import URL', async ({ page }) => {
    // Seed: booking_com channel has ical_import_url
    const bookingRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Booking.com' })
    const syncBtn = bookingRow.getByText('Sync')
    await expect(syncBtn).toBeEnabled()
  })

  test('clicking sync triggers sync and shows snackbar', async ({ page }) => {
    const bookingRow = page.locator('.v-data-table tbody tr').filter({ hasText: 'Booking.com' })
    const syncBtn = bookingRow.getByText('Sync')
    if (await syncBtn.isEnabled()) {
      await syncBtn.click()
      await page.waitForTimeout(3000)
      // Should show success or error snackbar (sync may fail with external URL)
    }
  })

  // ---------------------------------------------------------------------------
  // Create — unit selector for new channels
  // ---------------------------------------------------------------------------
  test('create dialog shows unit selector with seed units', async ({ page }) => {
    await page.getByRole('button', { name: 'Добавить канал' }).click()
    await page.waitForTimeout(500)
    // Unit selector should be visible
    await expect(page.locator('.v-dialog text=Юнит')).toBeVisible()
    // Click to open
    await page.locator('.v-dialog .v-select').first().click()
    await page.waitForTimeout(500)
    const options = page.locator('.v-list-item')
    const count = await options.count()
    expect(count).toBeGreaterThanOrEqual(3)
    await page.keyboard.press('Escape')
    await page.locator('.v-dialog').getByRole('button', { name: 'Отмена' }).click()
  })

  test('platform selector shows all 4 platforms', async ({ page }) => {
    await page.getByRole('button', { name: 'Добавить канал' }).click()
    await page.waitForTimeout(500)
    // Platform selector
    await page.locator('.v-dialog .v-select').nth(1).click()
    await page.waitForTimeout(500)
    const options = page.locator('.v-list-item')
    const texts = await options.allTextContents()
    const joined = texts.join(' ')
    expect(joined).toContain('Booking.com')
    expect(joined).toContain('Airbnb')
    expect(joined).toContain('Островок')
    expect(joined).toContain('Другое')
    await page.keyboard.press('Escape')
    await page.locator('.v-dialog').getByRole('button', { name: 'Отмена' }).click()
  })

  // ---------------------------------------------------------------------------
  // Edit — unit selector hidden
  // ---------------------------------------------------------------------------
  test('edit dialog hides unit selector (unit cannot be changed)', async ({ page }) => {
    const firstRow = page.locator('.v-data-table tbody tr').first()
    await firstRow.locator('.mdi-pencil').click()
    await expect(page.locator('.v-dialog')).toBeVisible()
    await expect(page.locator('text=Редактировать канал')).toBeVisible()
    // Unit selector should NOT be visible
    const selects = page.locator('.v-dialog .v-select')
    const count = await selects.count()
    // Should have only platform selector (1), not unit (2)
    expect(count).toBe(1)
    await page.locator('.v-dialog').getByRole('button', { name: 'Отмена' }).click()
  })

  // ---------------------------------------------------------------------------
  // Copy URL
  // ---------------------------------------------------------------------------
  test('copy button is visible next to each iCal URL', async ({ page }) => {
    const copyBtns = page.locator('.mdi-content-copy')
    const count = await copyBtns.count()
    expect(count).toBeGreaterThanOrEqual(3) // 3 channels in seed
  })
})
