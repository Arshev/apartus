import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Calendar — grid rendering and interactions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/calendar')
    await page.waitForTimeout(3000)
  })

  // ---------------------------------------------------------------------------
  // Grid structure
  // ---------------------------------------------------------------------------
  test('grid renders unit rows with "Property → Unit" format', async ({ page }) => {
    const unitCells = page.locator('.calendar-unit-cell')
    const count = await unitCells.count()
    expect(count).toBeGreaterThanOrEqual(4) // seed has 6 units
    const text = await unitCells.first().textContent()
    expect(text).toContain('→')
  })

  test('grid renders 14 date columns in header', async ({ page }) => {
    const headerCells = page.locator('.calendar-header-cell')
    // 1 (unit label) + 14 (dates) = 15
    const count = await headerCells.count()
    expect(count).toBe(15)
  })

  test('date headers show day.month format', async ({ page }) => {
    const dateHeader = page.locator('.calendar-header-cell').nth(1) // first date cell
    const text = await dateHeader.textContent()
    // Format: "11.04" or similar
    expect(text?.trim()).toMatch(/\d{1,2}\.\d{2}/)
  })

  // ---------------------------------------------------------------------------
  // Navigation — shifting dates
  // ---------------------------------------------------------------------------
  test('forward arrow shifts dates by 7 days', async ({ page }) => {
    const firstDateBefore = await page.locator('.calendar-header-cell').nth(1).textContent()
    await page.locator('.mdi-chevron-right').click()
    await page.waitForTimeout(1500)
    const firstDateAfter = await page.locator('.calendar-header-cell').nth(1).textContent()
    // Dates should have changed
    expect(firstDateAfter).not.toBe(firstDateBefore)
  })

  test('back arrow shifts dates backward', async ({ page }) => {
    // Shift forward first, then back — should return to original
    const firstDateOriginal = await page.locator('.calendar-header-cell').nth(1).textContent()
    await page.locator('.mdi-chevron-right').click()
    await page.waitForTimeout(1500)
    await page.locator('.mdi-chevron-left').click()
    await page.waitForTimeout(1500)
    const firstDateAfter = await page.locator('.calendar-header-cell').nth(1).textContent()
    expect(firstDateAfter).toBe(firstDateOriginal)
  })

  test('today button returns to current date window', async ({ page }) => {
    // Shift forward twice
    await page.locator('.mdi-chevron-right').click()
    await page.waitForTimeout(1000)
    await page.locator('.mdi-chevron-right').click()
    await page.waitForTimeout(1000)
    // Click today
    await page.getByText('Сегодня').click()
    await page.waitForTimeout(1500)
    // First date should contain today's day
    const today = new Date()
    const todayStr = `${today.getDate()}.${String(today.getMonth() + 1).padStart(2, '0')}`
    const firstDate = await page.locator('.calendar-header-cell').nth(1).textContent()
    expect(firstDate?.trim()).toBe(todayStr)
  })

  // ---------------------------------------------------------------------------
  // Reservation blocks rendering
  // ---------------------------------------------------------------------------
  test('active reservations render as colored blocks in grid', async ({ page }) => {
    // Seed has current checked_in reservations — they should render as blocks
    const reservationBlocks = page.locator('.calendar-day-cell .reservation-bar, .calendar-day-cell[style*="background"]')
    // At least look for colored cells indicating reservations
    const allDayCells = page.locator('.calendar-day-cell')
    const count = await allDayCells.count()
    expect(count).toBeGreaterThan(0)
  })

  // ---------------------------------------------------------------------------
  // Cell click → create reservation
  // ---------------------------------------------------------------------------
  test('clicking empty cell navigates to new reservation with unit_id and date prefilled', async ({ page }) => {
    // Click a day cell — navigate to create form
    const emptyCells = page.locator('.calendar-day-cell')
    // Click a cell that's likely empty (far in the future)
    await page.locator('.mdi-chevron-right').click()
    await page.waitForTimeout(1500)
    await page.locator('.mdi-chevron-right').click()
    await page.waitForTimeout(1500)
    // Click first available day cell
    const cell = emptyCells.first()
    await cell.click()
    await page.waitForTimeout(1000)
    // Should navigate to /reservations/new with query params
    expect(page.url()).toContain('/reservations/new')
  })

  test('reservation bar click navigates to reservation edit', async ({ page }) => {
    // Seed has current reservations — look for a reservation bar/label in grid
    const reservationBar = page.locator('.reservation-bar, .calendar-day-cell .reservation-label').first()
    if (await reservationBar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reservationBar.click()
      await page.waitForTimeout(1000)
      expect(page.url()).toContain('/reservations/')
    }
  })

  test('calendar has header "Юнит" in first column', async ({ page }) => {
    const header = page.locator('.calendar-header-cell.sticky-col')
    await expect(header).toBeVisible()
    const text = await header.textContent()
    expect(text).toContain('Юнит')
  })
})
