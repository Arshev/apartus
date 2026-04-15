import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

// FT-020 Phase 1 — Gantt Calendar e2e (CHK-07).
//
// Per feature.md EC-06: e2e verifies render + today marker + jump-to-date
// using existing seed data. Lane-stacking overlap handling (SC-05) is
// defensive code and verified at unit/component level (CHK-02) — backend's
// `Reservation#no_overlapping_reservations` prevents creating overlap
// through the public API, so direct e2e assertion is not feasible.

test.describe('Gantt Calendar (CHK-07)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/calendar')
  })

  test('renders at least one reservation bar from seed data (SC-01)', async ({ page }) => {
    await page.waitForSelector('.gantt-item', { timeout: 10000 })
    const count = await page.locator('.gantt-item').count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('today marker is visible in default range (SC-01)', async ({ page }) => {
    await page.waitForSelector('[data-testid="today-marker"]', { timeout: 5000 })
    await expect(page.locator('[data-testid="today-marker"]')).toBeVisible()
  })

  test('jump-to-date button opens date picker (SC-06)', async ({ page }) => {
    // Click-day interaction with Vuetify v-date-picker is notoriously brittle
    // in headless Chrome (day-button DOM structure varies by month); test
    // the interaction entry point here and leave actual date-pick to manual
    // QA (STEP-18). The underlying scrollToDate logic is unit-tested in
    // GanttTimeline.test.js.
    await page.waitForSelector('[data-testid="jump-btn"]', { timeout: 5000 })
    await page.locator('[data-testid="jump-btn"]').click()
    await expect(page.locator('.v-date-picker')).toBeVisible({ timeout: 3000 })
  })
})
